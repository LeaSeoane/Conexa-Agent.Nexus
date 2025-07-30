import { DetectedEndpoint, AuthenticationMethod } from '../types';
export declare class SwaggerService {
    fetchAndParseSwagger(url: string): Promise<any>;
    extractEndpoints(swaggerDoc: any): DetectedEndpoint[];
    extractAuthentication(swaggerDoc: any): AuthenticationMethod;
    private inferEndpointPurpose;
    private extractParameters;
    private extractResponses;
}
//# sourceMappingURL=swagger.service.d.ts.map