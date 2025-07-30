import { PDFService } from '../../src/services/pdf.service';

describe('PDFService', () => {
  let pdfService: PDFService;

  beforeEach(() => {
    pdfService = new PDFService();
  });

  describe('validatePDF', () => {
    it('should validate correct PDF signature', () => {
      const validPDFBuffer = Buffer.from('%PDF-1.4\n');
      expect(pdfService.validatePDF(validPDFBuffer)).toBe(true);
    });

    it('should reject invalid PDF signature', () => {
      const invalidBuffer = Buffer.from('Not a PDF');
      expect(pdfService.validatePDF(invalidBuffer)).toBe(false);
    });
  });

  describe('analyzePDFStructure', () => {
    it('should detect endpoints in text', async () => {
      const text = `
        API Documentation
        POST /api/payments
        GET /api/transactions
        Authentication required
        Example request:
        curl -X POST https://api.example.com/payments
      `;

      const result = await pdfService.analyzePDFStructure(text);

      expect(result.hasEndpoints).toBe(true);
      expect(result.hasAuthentication).toBe(true);  
      expect(result.hasExamples).toBe(true);
    });

    it('should return false for missing elements', async () => {
      const text = 'Simple documentation without technical details';

      const result = await pdfService.analyzePDFStructure(text);

      expect(result.hasEndpoints).toBe(false);
      expect(result.hasAuthentication).toBe(false);
      expect(result.hasExamples).toBe(false);
    });
  });
});