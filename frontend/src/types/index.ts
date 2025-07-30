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

export interface UploadResponse {
  success: boolean;
  jobId: string;
  message: string;
  status: string;
}

export interface JobResult {
  success: boolean;
  jobId: string;
  analysis?: AnalysisResult;
  generatedSDK?: GeneratedSDK;
}