import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { createError } from '../middleware/error.middleware';
import { AnalysisResult, DetectedEndpoint, AuthenticationMethod } from '../types';
import { PDFAnalysis } from './pdf.service';
import { SwaggerAnalysis } from './swagger.service';

export interface DocumentAnalysisInput {
  type: 'pdf' | 'swagger';
  providerName: string;
  content?: string; // For PDF
  pdfAnalysis?: PDFAnalysis; // For PDF
  swaggerAnalysis?: SwaggerAnalysis; // For Swagger
}

export interface SDKGenerationRequest {
  analysis: AnalysisResult;
  providerName: string;
  providerType: 'payment' | 'shipping' | 'marketing';
  endpoints: DetectedEndpoint[];
  authentication: AuthenticationMethod;
  schemas?: Record<string, any>;
}

export class AIAnalysisService {
  private openai: OpenAI | null;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  constructor() {
    // Always try to initialize OpenAI, even if key might be missing
    // This ensures we attempt real API calls first
    const apiKey = process.env.OPENAI_API_KEY;
    
    console.log('🔑 OpenAI API Key status:', {
      present: !!apiKey,
      isPlaceholder: apiKey === 'your_actual_openai_api_key_here',
      firstChars: apiKey?.substring(0, 8) || 'NOT_SET'
    });
    
    if (!apiKey || apiKey === 'your_actual_openai_api_key_here') {
      logger.error('❌ CRITICAL: OpenAI API key not properly configured! Set OPENAI_API_KEY in .env file');
      this.openai = null;
    } else {
      this.openai = new OpenAI({
        apiKey: apiKey,
        timeout: 60000
      });
      logger.info('✅ OpenAI integration initialized - will attempt real API calls');
    }
  }

  async analyzeDocumentation(input: DocumentAnalysisInput): Promise<AnalysisResult> {
    console.log('🚀 ANALYZING DOCUMENTATION - ATTEMPTING REAL OPENAI API CALL');
    console.log('Provider:', input.providerName, 'Type:', input.type);
    
    // FORCE attempt to create OpenAI client if not already created
    if (!this.openai && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_actual_openai_api_key_here') {
      console.log('🔄 Attempting to initialize OpenAI client with API key...');
      try {
        this.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          timeout: 60000
        });
        logger.info('✅ OpenAI client created successfully');
      } catch (error) {
        logger.error('❌ Failed to create OpenAI client:', error instanceof Error ? error.message : String(error));
      }
    }

    if (!this.openai) {
      logger.error('❌ CRITICAL: No OpenAI client available - check API key configuration');
      logger.error('Current OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET (length: ' + process.env.OPENAI_API_KEY.length + ')' : 'NOT SET');
      return this.simulateAnalysis(input);
    }

    try {
      console.log('🤖 Making REAL OpenAI API call...');
      const analysisResult = await this.performAnalysisWithRetry(input);
      
      console.log('✅ REAL OpenAI API call successful!');
      console.log('📊 Analysis result:', {
        confidence: analysisResult.confidence,
        providerType: analysisResult.providerType,
        endpointsFound: analysisResult.endpoints.length,
        authType: analysisResult.authentication.type
      });
      
      return analysisResult;
    } catch (error) {
      console.log('❌ REAL OpenAI API call FAILED:', error instanceof Error ? error.message : String(error));
      logger.error('OpenAI API error - falling back to simulation:', error);
      return this.simulateAnalysis(input);
    }
  }

  private async performAnalysisWithRetry(input: DocumentAnalysisInput, retryCount = 0): Promise<AnalysisResult> {
    try {
      const prompt = this.buildComprehensiveAnalysisPrompt(input);
      
      console.log('📤 Sending request to OpenAI API...');
      console.log('Model: gpt-3.5-turbo');
      console.log('Prompt length:', prompt.length, 'characters');
      
      const startTime = Date.now();
      
      const response = await this.openai!.chat.completions.create({
        model: 'gpt-3.5-turbo',  // Using gpt-3.5-turbo for faster/cheaper calls
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });
      
      const endTime = Date.now();
      console.log('📥 OpenAI API Response received!');
      console.log('⏱️  Response time:', endTime - startTime, 'ms');
      console.log('💰 Token usage:', response.usage);
      console.log('🏷️  Model used:', response.model);

      const analysis = response.choices[0]?.message?.content;
      if (!analysis) {
        throw createError('No analysis received from OpenAI', 500, 'AI_NO_RESPONSE');
      }
      
      console.log('📝 Raw OpenAI response (first 200 chars):', analysis.substring(0, 200) + '...');

      return this.parseAndValidateAIResponse(analysis, input.providerName);
    } catch (error) {
      console.log('❌ OpenAI API call failed (attempt', retryCount + 1, '):', error instanceof Error ? error.message : String(error));
      
      if (retryCount < this.maxRetries) {
        const delayMs = this.retryDelay * (retryCount + 1);
        console.log('🔄 Retrying in', delayMs, 'ms...');
        await this.delay(delayMs);
        return this.performAnalysisWithRetry(input, retryCount + 1);
      }
      
      console.log('❌ All retry attempts failed');
      throw error;
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert API integration analyst specializing in ecommerce integrations. Your task is to analyze API documentation and determine if it can be integrated following Conexa's established patterns.

CONEXA INTEGRATION PATTERNS (from CLAUDE.md):
- Payment providers must implement: createPayment, getPaymentDetails, cancelPayment
- Shipping providers must implement: createShipment, getShipmentDetails, updateShipment, cancelShipment, getShippingLabel, getTrackingUrl
- Marketing providers must implement: sendEmail, sendSMS, createCampaign, getSubscribers

You must respond ONLY with valid JSON following this exact structure:
{
  "isViable": boolean,
  "providerType": "payment" | "shipping" | "marketing" | "unknown",
  "confidence": number (0-100),
  "endpoints": [
    {
      "path": "string",
      "method": "GET|POST|PUT|DELETE|PATCH",
      "purpose": "string (e.g., create_payment, get_shipment)",
      "parameters": [{"name": "string", "type": "string", "required": boolean, "description": "string"}],
      "responses": [{"statusCode": number, "description": "string", "schema": {}}]
    }
  ],
  "authentication": {
    "type": "bearer" | "api-key" | "oauth" | "basic" | "unknown",
    "location": "header" | "query" | "body",
    "parameterName": "string",
    "description": "string"
  },
  "issues": ["string array of missing or problematic elements"],
  "recommendations": ["string array of implementation suggestions"]
}`;
  }

  private buildComprehensiveAnalysisPrompt(input: DocumentAnalysisInput): string {
    let prompt = `Analyze this ${input.type.toUpperCase()} API documentation for "${input.providerName}" and determine integration viability following Conexa patterns.\n\n`;

    if (input.type === 'pdf' && input.pdfAnalysis) {
      prompt += `PDF METADATA:
- Pages: ${input.pdfAnalysis.metadata.pages}
- Title: ${input.pdfAnalysis.metadata.title || 'N/A'}
- Has Endpoints: ${input.pdfAnalysis.structure.hasEndpoints}
- Has Authentication: ${input.pdfAnalysis.structure.hasAuthentication}
- Detected API Type: ${input.pdfAnalysis.structure.apiType}
- Sections: ${input.pdfAnalysis.structure.detectedSections.join(', ')}

EXTRACTED CONTENT:
${input.pdfAnalysis.cleanedText.substring(0, 8000)}`;
    } else if (input.type === 'swagger' && input.swaggerAnalysis) {
      prompt += `SWAGGER METADATA:
- Version: ${input.swaggerAnalysis.version}
- Title: ${input.swaggerAnalysis.info.title || 'N/A'}
- Base URL: ${input.swaggerAnalysis.info.baseUrl}
- Endpoints Count: ${input.swaggerAnalysis.endpoints.length}
- Detected API Type: ${input.swaggerAnalysis.apiType}
- Authentication: ${input.swaggerAnalysis.authentication.type}

SWAGGER DOCUMENT:
${JSON.stringify(input.swaggerAnalysis.document, null, 2).substring(0, 8000)}`;
    } else if (input.content) {
      prompt += `CONTENT:
${input.content.substring(0, 8000)}`;
    }

    prompt += `\n\nREQUIREMENTS:
1. Determine if this API can be integrated following Conexa patterns
2. Identify the provider type (payment/shipping/marketing)
3. Extract all available endpoints with their methods, parameters, and responses
4. Identify authentication mechanism
5. List any missing critical elements
6. Provide implementation recommendations

Focus on practical integration feasibility for TypeScript SDK generation.`;

    return prompt;
  }

  private parseAndValidateAIResponse(response: string, providerName: string): AnalysisResult {
    try {
      const parsed = JSON.parse(response);
      
      // Validate required fields
      if (typeof parsed.isViable !== 'boolean') {
        throw new Error('Invalid isViable field');
      }
      
      if (!['payment', 'shipping', 'marketing', 'unknown'].includes(parsed.providerType)) {
        throw new Error('Invalid providerType field');
      }
      
      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 100) {
        throw new Error('Invalid confidence field');
      }

      // Ensure arrays exist
      parsed.endpoints = Array.isArray(parsed.endpoints) ? parsed.endpoints : [];
      parsed.issues = Array.isArray(parsed.issues) ? parsed.issues : [];
      parsed.recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];

      // Validate authentication object
      if (!parsed.authentication || typeof parsed.authentication !== 'object') {
        parsed.authentication = { type: 'unknown' };
      }

      return parsed as AnalysisResult;
    } catch (error) {
      logger.error('Failed to parse AI response, using fallback:', error);
      throw createError('Invalid AI response format', 500, 'AI_PARSE_ERROR');
    }
  }

  async generateSDKCode(request: SDKGenerationRequest): Promise<{
    files: Array<{ path: string; content: string; type: string }>;
    packageJson: any;
    readme: string;
  }> {
    if (!this.openai) {
      logger.warn('OpenAI not available, using template-based generation');
      return this.generateTemplateBasedSDK(request);
    }

    try {
      logger.info(`Generating real SDK code for ${request.providerName} (${request.providerType})`);

      const codeGenResult = await this.performCodeGenerationWithRetry(request);
      
      logger.info(`SDK code generation completed for ${request.providerName}`);
      
      return codeGenResult;
    } catch (error) {
      logger.error('AI code generation failed, falling back to templates:', error);
      return this.generateTemplateBasedSDK(request);
    }
  }

  private async performCodeGenerationWithRetry(request: SDKGenerationRequest, retryCount = 0): Promise<any> {
    try {
      const codePrompt = this.buildCodeGenerationPrompt(request);
      
      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: this.getCodeGenerationSystemPrompt()
          },
          {
            role: 'user',
            content: codePrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      const codeResult = response.choices[0]?.message?.content;
      if (!codeResult) {
        throw createError('No code generation result from OpenAI', 500, 'AI_NO_CODE');
      }

      return JSON.parse(codeResult);
    } catch (error) {
      if (retryCount < this.maxRetries) {
        logger.warn(`Code generation attempt ${retryCount + 1} failed, retrying...`);
        await this.delay(this.retryDelay * (retryCount + 1));
        return this.performCodeGenerationWithRetry(request, retryCount + 1);
      }
      throw error;
    }
  }

  private getCodeGenerationSystemPrompt(): string {
    return `You are an expert TypeScript developer specializing in SDK generation following Conexa's established patterns.

Generate a complete TypeScript SDK following these EXACT patterns from CLAUDE.md:
1. ClientSDK class with service properties
2. Service classes with proper error handling
3. Complete TypeScript interfaces and DTOs
4. Proper package.json with Conexa standards
5. Jest tests and configuration files

Respond ONLY with valid JSON containing the complete SDK structure.`;
  }

  private buildCodeGenerationPrompt(request: SDKGenerationRequest): string {
    return `Generate a complete TypeScript SDK for "${request.providerName}" following Conexa patterns.

PROVIDER INFO:
- Name: ${request.providerName}
- Type: ${request.providerType}
- Endpoints: ${request.endpoints.length}
- Authentication: ${request.authentication.type}

ENDPOINTS:
${JSON.stringify(request.endpoints, null, 2)}

AUTHENTICATION:
${JSON.stringify(request.authentication, null, 2)}

Generate the complete SDK with all necessary files, following CLAUDE.md specifications exactly.`;
  }

  private generateTemplateBasedSDK(request: SDKGenerationRequest): any {
    // Import and use the existing SDK generator service as fallback
    const { SDKGeneratorService } = require('./sdk-generator.service');
    const generator = new SDKGeneratorService();
    
    return generator.generateSDK(request.analysis, request.providerName);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private simulateAnalysis(input: DocumentAnalysisInput): AnalysisResult {
    logger.info(`Simulating analysis for ${input.providerName} (OpenAI not available)`);

    let content = '';
    let apiType: 'payment' | 'shipping' | 'marketing' | 'unknown' = 'unknown';

    if (input.type === 'pdf' && input.pdfAnalysis) {
      content = input.pdfAnalysis.cleanedText;
      apiType = input.pdfAnalysis.structure.apiType || 'unknown';
    } else if (input.type === 'swagger' && input.swaggerAnalysis) {
      content = JSON.stringify(input.swaggerAnalysis.document);
      apiType = input.swaggerAnalysis.apiType;
    } else if (input.content) {
      content = input.content;
    }

    const contentLower = content.toLowerCase();

    // Enhanced pattern matching for simulation
    const hasAuth = /auth|token|api[\s-]?key|bearer|oauth|jwt|credential/i.test(content);
    const hasEndpoints = /post|get|put|delete|patch|\/api\/|endpoint|route/i.test(content);
    const hasExamples = /example|sample|demo|curl|request|response|json/i.test(content);

    // Determine provider type if not already detected
    if (apiType === 'unknown') {
      const isPayment = /payment|transaction|checkout|billing|invoice|refund|charge|subscription|credit|card|currency|money/i.test(content);
      const isShipping = /shipping|shipment|delivery|logistics|tracking|label|address|package|freight|carrier/i.test(content);
      const isMarketing = /email|sms|notification|campaign|marketing|newsletter|subscriber|template|message/i.test(content);

      if (isPayment) apiType = 'payment';
      else if (isShipping) apiType = 'shipping';
      else if (isMarketing) apiType = 'marketing';
    }

    const confidence = (hasAuth ? 30 : 0) + (hasEndpoints ? 40 : 0) + (hasExamples ? 20 : 0) + (apiType !== 'unknown' ? 10 : 0);

    return {
      isViable: confidence >= 60,
      providerType: apiType,
      confidence,
      endpoints: this.generateSampleEndpoints(apiType),
      authentication: { 
        type: hasAuth ? 'bearer' : 'unknown',
        location: 'header',
        parameterName: 'Authorization',
        description: 'Bearer token authentication'
      },
      issues: confidence < 60 ? ['Insufficient documentation detected', 'Missing critical API details'] : [],
      recommendations: [
        'Review authentication requirements',
        'Verify all required endpoints are documented',
        'Check for rate limiting information',
        'Validate request/response schemas'
      ]
    };
  }

  private generateSampleEndpoints(providerType: string): DetectedEndpoint[] {
    if (providerType === 'payment') {
      return [
        {
          path: '/api/payments',
          method: 'POST',
          purpose: 'create_payment',
          parameters: [
            { name: 'amount', type: 'number', required: true, description: 'Payment amount' },
            { name: 'currency', type: 'string', required: true, description: 'Currency code' },
            { name: 'description', type: 'string', required: false, description: 'Payment description' }
          ],
          responses: [
            { statusCode: 201, description: 'Payment created successfully', schema: {} },
            { statusCode: 400, description: 'Invalid request', schema: {} }
          ]
        },
        {
          path: '/api/payments/{id}',
          method: 'GET',
          purpose: 'get_payment',
          parameters: [
            { name: 'id', type: 'string', required: true, description: 'Payment ID' }
          ],
          responses: [
            { statusCode: 200, description: 'Payment details', schema: {} },
            { statusCode: 404, description: 'Payment not found', schema: {} }
          ]
        }
      ];
    }

    if (providerType === 'shipping') {
      return [
        {
          path: '/api/shipments',
          method: 'POST',
          purpose: 'create_shipment',
          parameters: [
            { name: 'origin', type: 'object', required: true, description: 'Origin address' },
            { name: 'destination', type: 'object', required: true, description: 'Destination address' },
            { name: 'package', type: 'object', required: true, description: 'Package details' }
          ],
          responses: [
            { statusCode: 201, description: 'Shipment created successfully', schema: {} },
            { statusCode: 400, description: 'Invalid request', schema: {} }
          ]
        },
        {
          path: '/api/shipments/{id}',
          method: 'GET',
          purpose: 'get_shipment',
          parameters: [
            { name: 'id', type: 'string', required: true, description: 'Shipment ID' }
          ],
          responses: [
            { statusCode: 200, description: 'Shipment details', schema: {} },
            { statusCode: 404, description: 'Shipment not found', schema: {} }
          ]
        }
      ];
    }

    if (providerType === 'marketing') {
      return [
        {
          path: '/api/campaigns',
          method: 'POST',
          purpose: 'create_campaign',
          parameters: [
            { name: 'name', type: 'string', required: true, description: 'Campaign name' },
            { name: 'template', type: 'string', required: true, description: 'Email template' },
            { name: 'recipients', type: 'array', required: true, description: 'Recipient list' }
          ],
          responses: [
            { statusCode: 201, description: 'Campaign created successfully', schema: {} },
            { statusCode: 400, description: 'Invalid request', schema: {} }
          ]
        }
      ];
    }

    return [];
  }

}