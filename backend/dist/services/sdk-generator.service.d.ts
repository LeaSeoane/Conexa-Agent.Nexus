import { AnalysisResult, GeneratedSDK } from '../types';
export declare class SDKGeneratorService {
    generateSDK(analysis: AnalysisResult, providerName: string): Promise<GeneratedSDK>;
    private normalizeProviderName;
    private generateIndexFile;
    private generateClientSDKFile;
    private generateAppConfigFile;
    private generateHttpServiceFile;
    private generateLoggerFile;
    private generateErrorFile;
    private generateAuthServiceFile;
    private generatePaymentServiceFile;
    private generateShippingServiceFile;
    private generatePaymentInterfacesFile;
    private generateShippingInterfacesFile;
    private generateBaseInterfacesFile;
    private generateTestFile;
    private generateJestConfigFile;
    private generateTsConfigFile;
    private generateEslintConfigFile;
    private generatePackageJson;
    private generateReadme;
}
//# sourceMappingURL=sdk-generator.service.d.ts.map