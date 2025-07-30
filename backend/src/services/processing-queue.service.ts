import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { ProcessingJob, JobProgress, AnalysisResult, GeneratedSDK } from '../types';
import { PDFService, PDFAnalysis } from './pdf.service';
import { SwaggerService, SwaggerAnalysis } from './swagger.service';
import { AIAnalysisService, DocumentAnalysisInput, SDKGenerationRequest } from './ai-analysis.service';
import { SDKGeneratorService } from './sdk-generator.service';

interface PDFJobData {
  jobId: string;
  providerName: string;
  fileBuffer: Buffer;
  filename: string;
}

interface URLJobData {
  jobId: string;
  providerName: string;
  url: string;
}

export class ProcessingQueue extends EventEmitter {
  private jobs: Map<string, ProcessingJob> = new Map();
  private pdfService = new PDFService();
  private swaggerService = new SwaggerService();
  private aiService = new AIAnalysisService();
  private sdkGenerator = new SDKGeneratorService();

  async addPDFJob(data: PDFJobData): Promise<ProcessingJob> {
    const job: ProcessingJob = {
      id: data.jobId,
      type: 'pdf',
      status: 'pending',
      progress: 0,
      data,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.jobs.set(data.jobId, job);
    this.processPDFJob(data).catch(error => {
      logger.error(`PDF job ${data.jobId} failed:`, error);
      this.updateJobStatus(data.jobId, 'failed', 0, 'Processing failed', error.message);
    });

    return job;
  }

  async addURLJob(data: URLJobData): Promise<ProcessingJob> {
    const job: ProcessingJob = {
      id: data.jobId,
      type: 'url',
      status: 'pending',
      progress: 0,
      data,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.jobs.set(data.jobId, job);
    this.processURLJob(data).catch(error => {
      logger.error(`URL job ${data.jobId} failed:`, error);
      this.updateJobStatus(data.jobId, 'failed', 0, 'Processing failed', error.message);
    });

    return job;
  }

  async getJobStatus(jobId: string): Promise<JobProgress | null> {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    return {
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      message: this.getStatusMessage(job.status, job.progress),
      error: job.status === 'failed' ? 'Processing failed' : undefined
    };
  }

  async getJobResult(jobId: string): Promise<ProcessingJob | null> {
    return this.jobs.get(jobId) || null;
  }

  private async processPDFJob(data: PDFJobData): Promise<void> {
    const { jobId, providerName, fileBuffer, filename } = data;

    try {
      this.updateJobStatus(jobId, 'analyzing', 10, 'Validating PDF file');

      if (!this.pdfService.validatePDF(fileBuffer)) {
        throw new Error('Invalid PDF file format - not a valid PDF document');
      }

      this.updateJobStatus(jobId, 'analyzing', 20, 'Extracting and analyzing PDF content');
      const pdfAnalysis = await this.pdfService.extractAndAnalyzePDF(fileBuffer);
      
      this.updateJobStatus(jobId, 'analyzing', 50, `Performing AI analysis on ${pdfAnalysis.metadata.pages} pages`);
      
      const documentInput: DocumentAnalysisInput = {
        type: 'pdf',
        providerName,
        pdfAnalysis
      };

      const analysis = await this.aiService.analyzeDocumentation(documentInput);
      
      // 🔍 DEBUG: Log the complete PDF analysis result
      console.log('🔍 COMPLETE PDF ANALYSIS RESULT:');
      console.log('- Provider:', providerName);
      console.log('- Is Viable:', analysis.isViable);
      console.log('- Provider Type:', analysis.providerType);
      console.log('- Confidence:', analysis.confidence);
      console.log('- Endpoints Found:', analysis.endpoints.length);
      console.log('- Authentication:', analysis.authentication.type);
      console.log('- Issues:', analysis.issues);
      
      const job = this.jobs.get(jobId);
      if (job) {
        job.result = analysis;
      }

      this.updateJobStatus(jobId, 'analyzing', 70, `Analysis completed: ${analysis.confidence}% confidence, ${analysis.providerType} provider`);

      if (analysis.isViable) {
        this.updateJobStatus(jobId, 'generating', 80, 'Generating TypeScript SDK');
        const generatedSDK = await this.sdkGenerator.generateSDK(analysis, providerName);
        
        if (job) {
          job.generatedSDK = generatedSDK;
        }

        this.updateJobStatus(jobId, 'completed', 100, `SDK generated successfully for ${providerName}`);
      } else {
        const issues = analysis.issues.length > 0 ? ` Issues: ${analysis.issues.slice(0, 2).join(', ')}` : '';
        this.updateJobStatus(jobId, 'completed', 100, `Analysis completed - SDK generation not viable.${issues}`);
      }

    } catch (error) {
      logger.error(`PDF processing failed for job ${jobId} (${filename}):`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateJobStatus(jobId, 'failed', 0, 'PDF processing failed', errorMessage);
    }
  }

  private async processURLJob(data: URLJobData): Promise<void> {
    const { jobId, providerName, url } = data;

    try {
      this.updateJobStatus(jobId, 'analyzing', 10, 'Fetching Swagger/OpenAPI documentation');

      const swaggerAnalysis = await this.swaggerService.fetchAndAnalyzeSwagger(url);
      this.updateJobStatus(jobId, 'analyzing', 40, `Found ${swaggerAnalysis.version} spec with ${swaggerAnalysis.endpoints.length} endpoints`);

      this.updateJobStatus(jobId, 'analyzing', 50, 'Performing AI analysis on API specification');
      
      const documentInput: DocumentAnalysisInput = {
        type: 'swagger',
        providerName,
        swaggerAnalysis
      };

      const analysis = await this.aiService.analyzeDocumentation(documentInput);
      
      // 🔍 DEBUG: Log the complete Swagger analysis result
      console.log('🔍 COMPLETE SWAGGER ANALYSIS RESULT:');
      console.log('- Provider:', providerName);
      console.log('- Is Viable:', analysis.isViable);
      console.log('- Provider Type:', analysis.providerType);
      console.log('- Confidence:', analysis.confidence);
      console.log('- Endpoints Found:', analysis.endpoints.length);
      console.log('- Authentication:', analysis.authentication.type);
      console.log('- Issues:', analysis.issues);
      
      const job = this.jobs.get(jobId);
      if (job) {
        job.result = analysis;
      }

      this.updateJobStatus(jobId, 'analyzing', 70, `Analysis completed: ${analysis.confidence}% confidence, ${analysis.providerType} provider`);

      if (analysis.isViable) {
        this.updateJobStatus(jobId, 'generating', 80, 'Generating TypeScript SDK from API specification');
        const generatedSDK = await this.sdkGenerator.generateSDK(analysis, providerName);
        
        if (job) {
          job.generatedSDK = generatedSDK;
        }

        this.updateJobStatus(jobId, 'completed', 100, `SDK generated successfully for ${providerName}`);
      } else {
        const issues = analysis.issues.length > 0 ? ` Issues: ${analysis.issues.slice(0, 2).join(', ')}` : '';
        this.updateJobStatus(jobId, 'completed', 100, `Analysis completed - SDK generation not viable.${issues}`);
      }

    } catch (error) {
      logger.error(`URL processing failed for job ${jobId} (${url}):`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateJobStatus(jobId, 'failed', 0, 'Swagger/OpenAPI processing failed', errorMessage);
    }
  }

  private updateJobStatus(
    jobId: string, 
    status: ProcessingJob['status'], 
    progress: number, 
    message: string,
    error?: string
  ): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      job.progress = progress;
      job.updatedAt = new Date();

      const progressUpdate: JobProgress = {
        jobId,
        status,
        progress,
        message,
        error
      };

      this.emit('progress', progressUpdate);
      logger.info(`Job ${jobId} progress: ${progress}% - ${message}`);
    }
  }

  private getStatusMessage(status: ProcessingJob['status'], progress: number): string {
    switch (status) {
      case 'pending': return 'Job queued for processing';
      case 'analyzing': return `Analyzing documentation... ${progress}%`;
      case 'generating': return `Generating SDK... ${progress}%`;
      case 'completed': return 'Processing completed successfully';
      case 'failed': return 'Processing failed';
      default: return 'Unknown status';
    }
  }

}