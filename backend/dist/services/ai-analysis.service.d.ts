import { AnalysisResult } from '../types';
export declare class AIAnalysisService {
    private openai;
    constructor();
    analyzeDocumentation(content: string, providerName: string): Promise<AnalysisResult>;
    private buildAnalysisPrompt;
    private parseAIResponse;
    private simulateAnalysis;
    private generateSampleEndpoints;
}
//# sourceMappingURL=ai-analysis.service.d.ts.map