"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAnalysisService = void 0;
const openai_1 = __importDefault(require("openai"));
const logger_1 = require("../utils/logger");
const error_middleware_1 = require("../middleware/error.middleware");
class AIAnalysisService {
    openai;
    constructor() {
        if (!process.env.OPENAI_API_KEY) {
            logger_1.logger.warn('OpenAI API key not provided. AI analysis will be simulated.');
            this.openai = null;
        }
        else {
            this.openai = new openai_1.default({
                apiKey: process.env.OPENAI_API_KEY
            });
        }
    }
    async analyzeDocumentation(content, providerName) {
        if (!this.openai) {
            return this.simulateAnalysis(content, providerName);
        }
        try {
            logger_1.logger.info(`Starting AI analysis for provider: ${providerName}`);
            const prompt = this.buildAnalysisPrompt(content, providerName);
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert API analyst specializing in payment and shipping integrations. Analyze API documentation and provide structured feedback about implementation viability.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 2000
            });
            const analysis = response.choices[0]?.message?.content;
            if (!analysis) {
                throw (0, error_middleware_1.createError)('No analysis received from AI', 500, 'AI_NO_RESPONSE');
            }
            return this.parseAIResponse(analysis, providerName);
        }
        catch (error) {
            logger_1.logger.error('AI analysis failed:', error);
            return this.simulateAnalysis(content, providerName);
        }
    }
    buildAnalysisPrompt(content, providerName) {
        return `
Analyze the following API documentation for ${providerName} and provide a structured assessment:

DOCUMENTATION CONTENT:
${content.substring(0, 8000)}

Please analyze and respond with a JSON object containing:
{
  "isViable": boolean,
  "providerType": "payment" | "shipping" | "unknown",
  "confidence": number (0-100),
  "endpoints": [
    {
      "path": "string",
      "method": "string", 
      "purpose": "string",
      "parameters": [{"name": "string", "type": "string", "required": boolean}],
      "responses": [{"statusCode": number, "description": "string"}]
    }
  ],
  "authentication": {
    "type": "bearer" | "api-key" | "oauth" | "basic" | "unknown",
    "location": "header" | "query" | "body",
    "parameterName": "string"
  },
  "issues": ["string array of issues found"],
  "recommendations": ["string array of recommendations"]
}

Focus on:
1. Whether this is a payment or shipping provider
2. If the documentation provides enough detail for SDK implementation
3. Authentication mechanisms
4. Required endpoints for core functionality
5. Any missing critical information
`;
    }
    parseAIResponse(response, providerName) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in AI response');
            }
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                isViable: parsed.isViable || false,
                providerType: parsed.providerType || 'unknown',
                confidence: parsed.confidence || 0,
                endpoints: parsed.endpoints || [],
                authentication: parsed.authentication || { type: 'unknown' },
                issues: parsed.issues || [],
                recommendations: parsed.recommendations || []
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to parse AI response:', error);
            return this.simulateAnalysis('', providerName);
        }
    }
    simulateAnalysis(content, providerName) {
        logger_1.logger.info(`Simulating analysis for ${providerName} (OpenAI not available)`);
        const isPayment = content.toLowerCase().includes('payment') ||
            content.toLowerCase().includes('checkout') ||
            content.toLowerCase().includes('transaction');
        const isShipping = content.toLowerCase().includes('shipping') ||
            content.toLowerCase().includes('shipment') ||
            content.toLowerCase().includes('delivery');
        const hasAuth = content.toLowerCase().includes('auth') ||
            content.toLowerCase().includes('token') ||
            content.toLowerCase().includes('api key');
        const hasEndpoints = content.includes('POST') ||
            content.includes('GET') ||
            content.includes('/api/');
        const providerType = isPayment ? 'payment' : isShipping ? 'shipping' : 'unknown';
        const confidence = (hasAuth ? 30 : 0) + (hasEndpoints ? 40 : 0) + (providerType !== 'unknown' ? 30 : 0);
        return {
            isViable: confidence >= 60,
            providerType,
            confidence,
            endpoints: this.generateSampleEndpoints(providerType),
            authentication: {
                type: hasAuth ? 'bearer' : 'unknown',
                location: 'header',
                parameterName: 'Authorization'
            },
            issues: confidence < 60 ? ['Insufficient documentation detected', 'Missing critical API details'] : [],
            recommendations: [
                'Review authentication requirements',
                'Verify all required endpoints are documented',
                'Check for rate limiting information'
            ]
        };
    }
    generateSampleEndpoints(providerType) {
        if (providerType === 'payment') {
            return [
                {
                    path: '/api/payments',
                    method: 'POST',
                    purpose: 'create_payment',
                    parameters: [
                        { name: 'amount', type: 'number', required: true },
                        { name: 'currency', type: 'string', required: true },
                        { name: 'description', type: 'string', required: false }
                    ],
                    responses: [
                        { statusCode: 201, description: 'Payment created successfully' },
                        { statusCode: 400, description: 'Invalid request' }
                    ]
                },
                {
                    path: '/api/payments/{id}',
                    method: 'GET',
                    purpose: 'get_payment',
                    parameters: [
                        { name: 'id', type: 'string', required: true }
                    ],
                    responses: [
                        { statusCode: 200, description: 'Payment details' },
                        { statusCode: 404, description: 'Payment not found' }
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
                        { name: 'origin', type: 'object', required: true },
                        { name: 'destination', type: 'object', required: true },
                        { name: 'package', type: 'object', required: true }
                    ],
                    responses: [
                        { statusCode: 201, description: 'Shipment created successfully' },
                        { statusCode: 400, description: 'Invalid request' }
                    ]
                }
            ];
        }
        return [];
    }
}
exports.AIAnalysisService = AIAnalysisService;
//# sourceMappingURL=ai-analysis.service.js.map