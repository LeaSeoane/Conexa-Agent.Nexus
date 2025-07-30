import axios from 'axios';
import yaml from 'js-yaml';
import { logger } from '../utils/logger';
import { createError } from '../middleware/error.middleware';
import { DetectedEndpoint, AuthenticationMethod, Parameter, Response } from '../types';

export interface SwaggerAnalysis {
  document: any;
  version: '2.0' | '3.0' | '3.1' | 'unknown';
  info: {
    title?: string;
    version?: string;
    description?: string;
    baseUrl?: string;
  };
  endpoints: DetectedEndpoint[];
  authentication: AuthenticationMethod;
  schemas: Record<string, any>;
  apiType: 'payment' | 'shipping' | 'marketing' | 'unknown';
}

export class SwaggerService {
  async fetchAndAnalyzeSwagger(url: string): Promise<SwaggerAnalysis> {
    try {
      logger.info(`Fetching and analyzing Swagger documentation from: ${url}`);
      
      const swaggerDoc = await this.fetchSwaggerDocument(url);
      const version = this.detectVersion(swaggerDoc);
      const info = this.extractInfo(swaggerDoc);
      const endpoints = this.extractEndpoints(swaggerDoc);
      const authentication = this.extractAuthentication(swaggerDoc);
      const schemas = this.extractSchemas(swaggerDoc);
      const apiType = this.inferApiType(swaggerDoc, endpoints);

      logger.info(`Successfully analyzed Swagger: v${version}, ${endpoints.length} endpoints, ${apiType} API`);

      return {
        document: swaggerDoc,
        version,
        info,
        endpoints,
        authentication,
        schemas,
        apiType
      };
    } catch (error) {
      logger.error('Failed to fetch and analyze Swagger documentation:', error);
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error;
      }
      throw createError('Failed to process Swagger documentation', 500, 'SWAGGER_ANALYSIS_ERROR');
    }
  }

  private async fetchSwaggerDocument(url: string): Promise<any> {
    try {
      // Try different URL variations if the original fails
      const urlsToTry = [
        url,
        url.endsWith('/') ? url + 'swagger.json' : url + '/swagger.json',
        url.endsWith('/') ? url + 'openapi.json' : url + '/openapi.json',
        url.endsWith('/') ? url + 'swagger.yaml' : url + '/swagger.yaml',
        url.endsWith('/') ? url + 'openapi.yaml' : url + '/openapi.yaml'
      ];

      for (const tryUrl of urlsToTry) {
        try {
          const response = await axios.get(tryUrl, {
            timeout: 30000,
            headers: {
              'Accept': 'application/json, application/yaml, text/yaml, text/plain, */*',
              'User-Agent': 'Conexa-Integration-Generator/1.0.0'
            }
          });

          let swaggerDoc;
          
          if (typeof response.data === 'object') {
            swaggerDoc = response.data;
          } else if (typeof response.data === 'string') {
            try {
              swaggerDoc = JSON.parse(response.data);
            } catch {
              try {
                swaggerDoc = yaml.load(response.data) as any;
              } catch {
                throw createError('Unable to parse document as JSON or YAML', 400, 'PARSE_ERROR');
              }
            }
          }

          if (!swaggerDoc || (!swaggerDoc.swagger && !swaggerDoc.openapi)) {
            continue; // Try next URL
          }

          logger.info(`Successfully fetched Swagger document from: ${tryUrl}`);
          return swaggerDoc;
        } catch (error) {
          if (tryUrl === url) {
            // Log the original URL error, but continue trying variations
            logger.warn(`Failed to fetch from original URL ${url}: ${error instanceof Error ? error.message : String(error)}`);
          }
          continue;
        }
      }

      throw createError('No valid Swagger/OpenAPI document found at any URL variation', 404, 'SWAGGER_NOT_FOUND');
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error;
      }
      throw createError('Failed to fetch Swagger documentation', 500, 'SWAGGER_FETCH_ERROR');
    }
  }

  private detectVersion(swaggerDoc: any): '2.0' | '3.0' | '3.1' | 'unknown' {
    if (swaggerDoc.swagger) {
      return swaggerDoc.swagger.startsWith('2.') ? '2.0' : 'unknown';
    }
    if (swaggerDoc.openapi) {
      if (swaggerDoc.openapi.startsWith('3.0')) return '3.0';
      if (swaggerDoc.openapi.startsWith('3.1')) return '3.1';
    }
    return 'unknown';
  }

  private extractInfo(swaggerDoc: any): SwaggerAnalysis['info'] {
    const info = swaggerDoc.info || {};
    
    let baseUrl = '';
    if (swaggerDoc.swagger) {
      // Swagger 2.0
      const scheme = swaggerDoc.schemes?.[0] || 'https';
      const host = swaggerDoc.host || 'api.example.com';
      const basePath = swaggerDoc.basePath || '';
      baseUrl = `${scheme}://${host}${basePath}`;
    } else if (swaggerDoc.openapi) {
      // OpenAPI 3.x
      const server = swaggerDoc.servers?.[0];
      baseUrl = server?.url || 'https://api.example.com';
    }

    return {
      title: info.title,
      version: info.version,
      description: info.description,
      baseUrl
    };
  }

  private extractSchemas(swaggerDoc: any): Record<string, any> {
    if (swaggerDoc.swagger) {
      // Swagger 2.0
      return swaggerDoc.definitions || {};
    } else if (swaggerDoc.openapi) {
      // OpenAPI 3.x
      return swaggerDoc.components?.schemas || {};
    }
    return {};
  }

  private inferApiType(swaggerDoc: any, endpoints: DetectedEndpoint[]): 'payment' | 'shipping' | 'marketing' | 'unknown' {
    const fullDoc = JSON.stringify(swaggerDoc).toLowerCase();
    const endpointPaths = endpoints.map(e => e.path.toLowerCase()).join(' ');
    const combinedText = fullDoc + ' ' + endpointPaths;

    // Count occurrences of different API type indicators
    const paymentScore = this.countMatches(combinedText, [
      'payment', 'transaction', 'checkout', 'billing', 'invoice', 'refund', 
      'charge', 'subscription', 'credit', 'card', 'currency', 'money'
    ]);

    const shippingScore = this.countMatches(combinedText, [
      'shipping', 'shipment', 'delivery', 'logistics', 'tracking', 'label',
      'address', 'package', 'freight', 'carrier', 'transport'
    ]);

    const marketingScore = this.countMatches(combinedText, [
      'email', 'sms', 'notification', 'campaign', 'marketing', 'newsletter',
      'subscriber', 'template', 'message', 'communication'
    ]);

    const maxScore = Math.max(paymentScore, shippingScore, marketingScore);
    if (maxScore === 0) return 'unknown';

    if (paymentScore === maxScore) return 'payment';
    if (shippingScore === maxScore) return 'shipping';
    if (marketingScore === maxScore) return 'marketing';
    
    return 'unknown';
  }

  private countMatches(text: string, keywords: string[]): number {
    return keywords.reduce((count, keyword) => {
      const matches = text.match(new RegExp(keyword, 'g'));
      return count + (matches?.length || 0);
    }, 0);
  }

  // Legacy method for backward compatibility
  async fetchAndParseSwagger(url: string): Promise<any> {
    const analysis = await this.fetchAndAnalyzeSwagger(url);
    return analysis.document;
  }

  extractEndpoints(swaggerDoc: any): DetectedEndpoint[] {
    const endpoints: DetectedEndpoint[] = [];
    const paths = swaggerDoc.paths || {};

    for (const [path, pathItem] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (typeof operation === 'object' && operation !== null) {
          const endpoint: DetectedEndpoint = {
            path,
            method: method.toUpperCase(),
            purpose: this.inferEndpointPurpose(path, method, operation),
            parameters: this.extractParameters(operation),
            responses: this.extractResponses(operation)
          };
          endpoints.push(endpoint);
        }
      }
    }

    return endpoints;
  }

  extractAuthentication(swaggerDoc: any): AuthenticationMethod {
    const securitySchemes = swaggerDoc.components?.securitySchemes || 
                           swaggerDoc.securityDefinitions || {};

    for (const [name, scheme] of Object.entries(securitySchemes)) {
      const schemeObj = scheme as any;
      
      if (schemeObj.type === 'http' && schemeObj.scheme === 'bearer') {
        return {
          type: 'bearer',
          location: 'header',
          parameterName: 'Authorization',
          description: schemeObj.description
        };
      }
      
      if (schemeObj.type === 'apiKey') {
        return {
          type: 'api-key',
          location: schemeObj.in,
          parameterName: schemeObj.name,
          description: schemeObj.description
        };
      }
      
      if (schemeObj.type === 'oauth2') {
        return {
          type: 'oauth',
          description: schemeObj.description
        };
      }
    }

    return { type: 'unknown' };
  }

  private inferEndpointPurpose(path: string, method: string, operation: any): string {
    const summary = operation.summary || '';
    const pathLower = path.toLowerCase();
    const methodLower = method.toLowerCase();

    if (pathLower.includes('payment') || pathLower.includes('checkout')) {
      if (methodLower === 'post') return 'create_payment';
      if (methodLower === 'get') return 'get_payment';
      if (methodLower === 'delete') return 'cancel_payment';
    }

    if (pathLower.includes('shipment') || pathLower.includes('shipping')) {
      if (methodLower === 'post') return 'create_shipment';
      if (methodLower === 'get') return 'get_shipment';
      if (methodLower === 'put' || methodLower === 'patch') return 'update_shipment';
      if (methodLower === 'delete') return 'cancel_shipment';
    }

    if (pathLower.includes('auth') || pathLower.includes('token')) {
      return 'authentication';
    }

    return summary || `${methodLower}_${pathLower.split('/').pop() || 'resource'}`;
  }

  private extractParameters(operation: any): Parameter[] {
    const parameters: Parameter[] = [];
    const operationParams = operation.parameters || [];

    for (const param of operationParams) {
      parameters.push({
        name: param.name,
        type: param.schema?.type || param.type || 'string',
        required: param.required || false,
        description: param.description
      });
    }

    if (operation.requestBody) {
      const content = operation.requestBody.content;
      if (content?.['application/json']?.schema) {
        const schema = content['application/json'].schema;
        if (schema.properties) {
          for (const [propName, propSchema] of Object.entries(schema.properties)) {
            const prop = propSchema as any;
            parameters.push({
              name: propName,
              type: prop.type || 'object',
              required: schema.required?.includes(propName) || false,
              description: prop.description
            });
          }
        }
      }
    }

    return parameters;
  }

  private extractResponses(operation: any): Response[] {
    const responses: Response[] = [];
    const operationResponses = operation.responses || {};

    for (const [statusCode, response] of Object.entries(operationResponses)) {
      const responseObj = response as any;
      responses.push({
        statusCode: parseInt(statusCode),
        description: responseObj.description || '',
        schema: responseObj.content?.['application/json']?.schema
      });
    }

    return responses;
  }
}