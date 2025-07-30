export declare class PDFService {
    extractText(buffer: Buffer): Promise<string>;
    validatePDF(buffer: Buffer): boolean;
    analyzePDFStructure(text: string): Promise<{
        hasEndpoints: boolean;
        hasAuthentication: boolean;
        hasExamples: boolean;
        sections: string[];
    }>;
    private extractSections;
}
//# sourceMappingURL=pdf.service.d.ts.map