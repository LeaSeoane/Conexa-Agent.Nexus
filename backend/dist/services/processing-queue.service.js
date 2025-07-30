"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingQueue = void 0;
const events_1 = require("events");
const logger_1 = require("../utils/logger");
const pdf_service_1 = require("./pdf.service");
const swagger_service_1 = require("./swagger.service");
const ai_analysis_service_1 = require("./ai-analysis.service");
const sdk_generator_service_1 = require("./sdk-generator.service");
class ProcessingQueue extends events_1.EventEmitter {
    jobs = new Map();
    pdfService = new pdf_service_1.PDFService();
    swaggerService = new swagger_service_1.SwaggerService();
    aiService = new ai_analysis_service_1.AIAnalysisService();
    sdkGenerator = new sdk_generator_service_1.SDKGeneratorService();
    async addPDFJob(data) {
        const job = {
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
            logger_1.logger.error(`PDF job ${data.jobId} failed:`, error);
            this.updateJobStatus(data.jobId, 'failed', 0, 'Processing failed', error.message);
        });
        return job;
    }
    async addURLJob(data) {
        const job = {
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
            logger_1.logger.error(`URL job ${data.jobId} failed:`, error);
            this.updateJobStatus(data.jobId, 'failed', 0, 'Processing failed', error.message);
        });
        return job;
    }
    async getJobStatus(jobId) {
        const job = this.jobs.get(jobId);
        if (!job)
            return null;
        return {
            jobId: job.id,
            status: job.status,
            progress: job.progress,
            message: this.getStatusMessage(job.status, job.progress),
            error: job.status === 'failed' ? 'Processing failed' : undefined
        };
    }
    async getJobResult(jobId) {
        return this.jobs.get(jobId) || null;
    }
    async processPDFJob(data) {
        const { jobId, providerName, fileBuffer } = data;
        try {
            this.updateJobStatus(jobId, 'analyzing', 10, 'Extracting text from PDF');
            if (!this.pdfService.validatePDF(fileBuffer)) {
                throw new Error('Invalid PDF file format');
            }
            const extractedText = await this.pdfService.extractText(fileBuffer);
            this.updateJobStatus(jobId, 'analyzing', 30, 'Analyzing PDF structure');
            const pdfStructure = await this.pdfService.analyzePDFStructure(extractedText);
            this.updateJobStatus(jobId, 'analyzing', 50, 'Performing AI analysis');
            const analysis = await this.aiService.analyzeDocumentation(extractedText, providerName);
            const job = this.jobs.get(jobId);
            if (job) {
                job.result = analysis;
            }
            this.updateJobStatus(jobId, 'analyzing', 70, 'Analysis completed');
            if (analysis.isViable) {
                this.updateJobStatus(jobId, 'generating', 80, 'Generating SDK');
                const generatedSDK = await this.sdkGenerator.generateSDK(analysis, providerName);
                if (job) {
                    job.generatedSDK = generatedSDK;
                }
                this.updateJobStatus(jobId, 'completed', 100, 'SDK generated successfully');
            }
            else {
                this.updateJobStatus(jobId, 'completed', 100, 'Analysis completed - SDK generation not viable');
            }
        }
        catch (error) {
            logger_1.logger.error(`PDF processing failed for job ${jobId}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.updateJobStatus(jobId, 'failed', 0, 'Processing failed', errorMessage);
        }
    }
    async processURLJob(data) {
        const { jobId, providerName, url } = data;
        try {
            this.updateJobStatus(jobId, 'analyzing', 10, 'Fetching Swagger documentation');
            const swaggerDoc = await this.swaggerService.fetchAndParseSwagger(url);
            this.updateJobStatus(jobId, 'analyzing', 30, 'Parsing API endpoints');
            const endpoints = this.swaggerService.extractEndpoints(swaggerDoc);
            const authentication = this.swaggerService.extractAuthentication(swaggerDoc);
            this.updateJobStatus(jobId, 'analyzing', 50, 'Performing analysis');
            const analysis = {
                isViable: endpoints.length > 0 && authentication.type !== 'unknown',
                providerType: this.inferProviderType(endpoints),
                confidence: this.calculateConfidence(endpoints, authentication),
                endpoints,
                authentication,
                issues: [],
                recommendations: [
                    'Review endpoint implementations',
                    'Verify authentication flow',
                    'Test API responses'
                ]
            };
            const job = this.jobs.get(jobId);
            if (job) {
                job.result = analysis;
            }
            this.updateJobStatus(jobId, 'analyzing', 70, 'Analysis completed');
            if (analysis.isViable) {
                this.updateJobStatus(jobId, 'generating', 80, 'Generating SDK');
                const generatedSDK = await this.sdkGenerator.generateSDK(analysis, providerName);
                if (job) {
                    job.generatedSDK = generatedSDK;
                }
                this.updateJobStatus(jobId, 'completed', 100, 'SDK generated successfully');
            }
            else {
                this.updateJobStatus(jobId, 'completed', 100, 'Analysis completed - SDK generation not viable');
            }
        }
        catch (error) {
            logger_1.logger.error(`URL processing failed for job ${jobId}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.updateJobStatus(jobId, 'failed', 0, 'Processing failed', errorMessage);
        }
    }
    updateJobStatus(jobId, status, progress, message, error) {
        const job = this.jobs.get(jobId);
        if (job) {
            job.status = status;
            job.progress = progress;
            job.updatedAt = new Date();
            const progressUpdate = {
                jobId,
                status,
                progress,
                message,
                error
            };
            this.emit('progress', progressUpdate);
            logger_1.logger.info(`Job ${jobId} progress: ${progress}% - ${message}`);
        }
    }
    getStatusMessage(status, progress) {
        switch (status) {
            case 'pending': return 'Job queued for processing';
            case 'analyzing': return `Analyzing documentation... ${progress}%`;
            case 'generating': return `Generating SDK... ${progress}%`;
            case 'completed': return 'Processing completed successfully';
            case 'failed': return 'Processing failed';
            default: return 'Unknown status';
        }
    }
    inferProviderType(endpoints) {
        const paths = endpoints.map(e => e.path.toLowerCase()).join(' ');
        const purposes = endpoints.map(e => e.purpose.toLowerCase()).join(' ');
        const combined = paths + ' ' + purposes;
        if (combined.includes('payment') || combined.includes('checkout') || combined.includes('transaction')) {
            return 'payment';
        }
        if (combined.includes('shipment') || combined.includes('shipping') || combined.includes('delivery')) {
            return 'shipping';
        }
        return 'unknown';
    }
    calculateConfidence(endpoints, authentication) {
        let confidence = 0;
        if (endpoints.length > 0)
            confidence += 40;
        if (endpoints.length >= 3)
            confidence += 20;
        if (authentication.type !== 'unknown')
            confidence += 30;
        if (endpoints.some(e => e.method === 'POST'))
            confidence += 10;
        return Math.min(confidence, 100);
    }
}
exports.ProcessingQueue = ProcessingQueue;
//# sourceMappingURL=processing-queue.service.js.map