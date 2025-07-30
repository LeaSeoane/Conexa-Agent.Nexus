import pdf from 'pdf-parse';
import { logger } from '../utils/logger';
import { createError } from '../middleware/error.middleware';

export interface PDFAnalysis {
  rawText: string;
  cleanedText: string;
  metadata: {
    pages: number;
    title?: string;
    creator?: string;
    producer?: string;
  };
  structure: {
    hasEndpoints: boolean;
    hasAuthentication: boolean;
    hasExamples: boolean;
    hasSchemas: boolean;
    detectedSections: string[];
    apiType?: 'payment' | 'shipping' | 'marketing' | 'unknown';
  };
}

export class PDFService {
  async extractAndAnalyzePDF(buffer: Buffer): Promise<PDFAnalysis> {
    try {
      logger.info('Starting comprehensive PDF analysis');
      
      if (!this.validatePDF(buffer)) {
        throw createError('Invalid PDF file format', 400, 'INVALID_PDF');
      }

      const data = await pdf(buffer, {
        // Enhanced options for better text extraction
        max: 0, // Extract all pages
        version: 'v1.10.88'
      });
      
      if (!data.text || data.text.trim().length === 0) {
        throw createError('PDF appears to be empty or contains no extractable text', 400, 'EMPTY_PDF');
      }

      const rawText = data.text;
      const cleanedText = this.cleanExtractedText(rawText);
      const structure = await this.analyzeDocumentStructure(cleanedText);

      logger.info(`Successfully analyzed PDF: ${data.numpages} pages, ${cleanedText.length} characters`);

      return {
        rawText,
        cleanedText,
        metadata: {
          pages: data.numpages,
          title: data.info?.Title,
          creator: data.info?.Creator,
          producer: data.info?.Producer
        },
        structure
      };
    } catch (error) {
      logger.error('Failed to extract and analyze PDF:', error);
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error;
      }
      throw createError('Failed to process PDF file', 500, 'PDF_PROCESSING_ERROR');
    }
  }

  validatePDF(buffer: Buffer): boolean {
    const pdfSignature = buffer.slice(0, 4).toString();
    return pdfSignature === '%PDF';
  }

  private cleanExtractedText(rawText: string): string {
    return rawText
      // Remove excessive whitespace and normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      // Remove page numbers and headers/footers patterns
      .replace(/^Page \d+ of \d+$/gm, '')
      .replace(/^\d+\s*$/gm, '')
      // Clean up common PDF artifacts
      .replace(/[^\x20-\x7E\n]/g, ' ')
      .trim();
  }

  private async analyzeDocumentStructure(text: string): Promise<PDFAnalysis['structure']> {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Enhanced pattern matching for API documentation
    const endpointPatterns = [
      /\b(POST|GET|PUT|DELETE|PATCH)\s+\/[^\s]*/gi,
      /\/api\/[^\s]*/gi,
      /\/v\d+\/[^\s]*/gi,
      /endpoint[s]?[\s:]/gi,
      /route[s]?[\s:]/gi,
      /path[s]?[\s:]/gi,
      /https?:\/\/[^\s]+\/api/gi
    ];

    const authPatterns = [
      /authentication/gi,
      /authorization/gi,
      /\bauth\b/gi,
      /api[\s-]?key/gi,
      /bearer[\s-]?token/gi,
      /access[\s-]?token/gi,
      /oauth/gi,
      /jwt/gi,
      /basic[\s-]?auth/gi,
      /x-api-key/gi
    ];

    const examplePatterns = [
      /example[s]?/gi,
      /sample[s]?/gi,
      /demo/gi,
      /curl/gi,
      /request/gi,
      /response/gi,
      /payload/gi,
      /\{[\s\S]*?\}/g, // JSON objects
      /```[\s\S]*?```/g // Code blocks
    ];

    const schemaPatterns = [
      /schema[s]?/gi,
      /model[s]?/gi,
      /interface[s]?/gi,
      /type[s]?/gi,
      /parameter[s]?/gi,
      /field[s]?/gi,
      /property/gi,
      /attribute[s]?/gi
    ];

    // Detect API type based on content
    const paymentPatterns = [
      /payment[s]?/gi,
      /transaction[s]?/gi,
      /checkout/gi,
      /billing/gi,
      /invoice[s]?/gi,
      /refund[s]?/gi,
      /charge[s]?/gi,
      /subscription[s]?/gi,
      /credit[\s-]?card/gi,
      /\$|USD|EUR|currency/gi
    ];

    const shippingPatterns = [
      /shipping/gi,
      /shipment[s]?/gi,
      /delivery/gi,
      /logistics/gi,
      /tracking/gi,
      /label[s]?/gi,
      /address[es]?/gi,
      /package[s]?/gi,
      /freight/gi,
      /carrier[s]?/gi
    ];

    const marketingPatterns = [
      /email/gi,
      /sms/gi,
      /notification[s]?/gi,
      /campaign[s]?/gi,
      /marketing/gi,
      /newsletter[s]?/gi,
      /subscriber[s]?/gi,
      /template[s]?/gi
    ];

    const fullText = text.toLowerCase();

    const hasEndpoints = endpointPatterns.some(pattern => pattern.test(text));
    const hasAuthentication = authPatterns.some(pattern => pattern.test(text));
    const hasExamples = examplePatterns.some(pattern => pattern.test(text));
    const hasSchemas = schemaPatterns.some(pattern => pattern.test(text));

    // Determine API type based on keyword frequency
    const paymentScore = paymentPatterns.reduce((score, pattern) => 
      score + (fullText.match(pattern) || []).length, 0);
    const shippingScore = shippingPatterns.reduce((score, pattern) => 
      score + (fullText.match(pattern) || []).length, 0);
    const marketingScore = marketingPatterns.reduce((score, pattern) => 
      score + (fullText.match(pattern) || []).length, 0);

    let apiType: 'payment' | 'shipping' | 'marketing' | 'unknown' = 'unknown';
    const maxScore = Math.max(paymentScore, shippingScore, marketingScore);
    if (maxScore > 0) {
      if (paymentScore === maxScore) apiType = 'payment';
      else if (shippingScore === maxScore) apiType = 'shipping';
      else if (marketingScore === maxScore) apiType = 'marketing';
    }

    const detectedSections = this.extractSections(text);

    return {
      hasEndpoints,
      hasAuthentication,
      hasExamples,
      hasSchemas,
      detectedSections,
      apiType
    };
  }

  private extractSections(text: string): string[] {
    const sections: string[] = [];
    
    // Extract headers and section titles
    const headerPatterns = [
      /^[A-Z][A-Z\s]{5,}$/gm, // All caps headers
      /^\d+\.?\s+[A-Z][A-Za-z\s]{5,}$/gm, // Numbered sections
      /^#{1,3}\s+.+$/gm, // Markdown headers
      /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*:$/gm // Title case with colon
    ];

    headerPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      sections.push(...matches.map(match => match.trim()));
    });

    // Remove duplicates and limit results
    return [...new Set(sections)].slice(0, 15);
  }

  // Legacy method for backward compatibility
  async extractText(buffer: Buffer): Promise<string> {
    const analysis = await this.extractAndAnalyzePDF(buffer);
    return analysis.cleanedText;
  }
}