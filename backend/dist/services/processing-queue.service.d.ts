import { EventEmitter } from 'events';
import { ProcessingJob, JobProgress } from '../types';
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
export declare class ProcessingQueue extends EventEmitter {
    private jobs;
    private pdfService;
    private swaggerService;
    private aiService;
    private sdkGenerator;
    addPDFJob(data: PDFJobData): Promise<ProcessingJob>;
    addURLJob(data: URLJobData): Promise<ProcessingJob>;
    getJobStatus(jobId: string): Promise<JobProgress | null>;
    getJobResult(jobId: string): Promise<ProcessingJob | null>;
    private processPDFJob;
    private processURLJob;
    private updateJobStatus;
    private getStatusMessage;
    private inferProviderType;
    private calculateConfidence;
}
export {};
//# sourceMappingURL=processing-queue.service.d.ts.map