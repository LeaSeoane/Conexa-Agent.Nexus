"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwaggerService = void 0;
const axios_1 = __importDefault(require("axios"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const logger_1 = require("../utils/logger");
const error_middleware_1 = require("../middleware/error.middleware");
class SwaggerService {
    async fetchAndParseSwagger(url) {
        try {
            logger_1.logger.info(`Fetching Swagger documentation from: ${url}`);
            const response = await axios_1.default.get(url, {
                timeout: 30000,
                headers: {
                    'Accept': 'application/json, application/yaml, text/yaml, text/plain'
                }
            });
            let swaggerDoc;
            if (typeof response.data === 'object') {
                swaggerDoc = response.data;
            }
            else if (typeof response.data === 'string') {
                try {
                    swaggerDoc = JSON.parse(response.data);
                }
                catch {
                    swaggerDoc = js_yaml_1.default.load(response.data);
                }
            }
            if (!swaggerDoc || (!swaggerDoc.swagger && !swaggerDoc.openapi)) {
                throw (0, error_middleware_1.createError)('Invalid Swagger/OpenAPI document', 400, 'INVALID_SWAGGER');
            }
            logger_1.logger.info('Successfully parsed Swagger documentation');
            return swaggerDoc;
        }
        catch (error) {
            logger_1.logger.error('Failed to fetch Swagger documentation:', error);
            if (error instanceof Error && error.code === 'INVALID_SWAGGER') {
                throw error;
            }
            throw (0, error_middleware_1.createError)('Failed to fetch or parse Swagger documentation', 500, 'SWAGGER_FETCH_ERROR');
        }
    }
    extractEndpoints(swaggerDoc) {
        const endpoints = [];
        const paths = swaggerDoc.paths || {};
        for (const [path, pathItem] of Object.entries(paths)) {
            for (const [method, operation] of Object.entries(pathItem)) {
                if (typeof operation === 'object' && operation !== null) {
                    const endpoint = {
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
    extractAuthentication(swaggerDoc) {
        const securitySchemes = swaggerDoc.components?.securitySchemes ||
            swaggerDoc.securityDefinitions || {};
        for (const [name, scheme] of Object.entries(securitySchemes)) {
            const schemeObj = scheme;
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
    inferEndpointPurpose(path, method, operation) {
        const summary = operation.summary || '';
        const pathLower = path.toLowerCase();
        const methodLower = method.toLowerCase();
        if (pathLower.includes('payment') || pathLower.includes('checkout')) {
            if (methodLower === 'post')
                return 'create_payment';
            if (methodLower === 'get')
                return 'get_payment';
            if (methodLower === 'delete')
                return 'cancel_payment';
        }
        if (pathLower.includes('shipment') || pathLower.includes('shipping')) {
            if (methodLower === 'post')
                return 'create_shipment';
            if (methodLower === 'get')
                return 'get_shipment';
            if (methodLower === 'put' || methodLower === 'patch')
                return 'update_shipment';
            if (methodLower === 'delete')
                return 'cancel_shipment';
        }
        if (pathLower.includes('auth') || pathLower.includes('token')) {
            return 'authentication';
        }
        return summary || `${methodLower}_${pathLower.split('/').pop() || 'resource'}`;
    }
    extractParameters(operation) {
        const parameters = [];
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
                        const prop = propSchema;
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
    extractResponses(operation) {
        const responses = [];
        const operationResponses = operation.responses || {};
        for (const [statusCode, response] of Object.entries(operationResponses)) {
            const responseObj = response;
            responses.push({
                statusCode: parseInt(statusCode),
                description: responseObj.description || '',
                schema: responseObj.content?.['application/json']?.schema
            });
        }
        return responses;
    }
}
exports.SwaggerService = SwaggerService;
//# sourceMappingURL=swagger.service.js.map