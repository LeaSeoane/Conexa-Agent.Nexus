export interface JobProgress {
    jobId: string;
    status: 'pending' | 'analyzing' | 'generating' | 'completed' | 'failed';
    progress: number;
    message: string;
    error?: string;
}
export interface AnalysisResult {
    isViable: boolean;
    providerType: 'payment' | 'shipping' | 'unknown';
    confidence: number;
    endpoints: DetectedEndpoint[];
    authentication: AuthenticationMethod;
    issues: string[];
    recommendations: string[];
}
export interface DetectedEndpoint {
    path: string;
    method: string;
    purpose: string;
    parameters: Parameter[];
    responses: Response[];
}
export interface Parameter {
    name: string;
    type: string;
    required: boolean;
    description?: string;
}
export interface Response {
    statusCode: number;
    description: string;
    schema?: any;
}
export interface AuthenticationMethod {
    type: 'bearer' | 'api-key' | 'oauth' | 'basic' | 'unknown';
    location?: 'header' | 'query' | 'body';
    parameterName?: string;
    description?: string;
}
export interface GeneratedSDK {
    providerName: string;
    files: GeneratedFile[];
    packageJson: any;
    readme: string;
}
export interface GeneratedFile {
    path: string;
    content: string;
    type: 'typescript' | 'json' | 'markdown' | 'javascript';
}
export interface UploadRequest {
    type: 'pdf' | 'url';
    data: string | Buffer;
    filename?: string;
    providerName: string;
}
export interface ProcessingJob {
    id: string;
    type: 'pdf' | 'url';
    status: JobProgress['status'];
    progress: number;
    data: any;
    result?: AnalysisResult;
    generatedSDK?: GeneratedSDK;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=index.d.ts.map