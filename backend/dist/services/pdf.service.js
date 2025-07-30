"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFService = void 0;
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const logger_1 = require("../utils/logger");
const error_middleware_1 = require("../middleware/error.middleware");
class PDFService {
    async extractText(buffer) {
        try {
            logger_1.logger.info('Extracting text from PDF');
            const data = await (0, pdf_parse_1.default)(buffer);
            if (!data.text || data.text.trim().length === 0) {
                throw (0, error_middleware_1.createError)('PDF appears to be empty or contains no extractable text', 400, 'EMPTY_PDF');
            }
            logger_1.logger.info(`Successfully extracted ${data.text.length} characters from PDF`);
            return data.text;
        }
        catch (error) {
            logger_1.logger.error('Failed to extract text from PDF:', error);
            throw (0, error_middleware_1.createError)('Failed to process PDF file', 500, 'PDF_PROCESSING_ERROR');
        }
    }
    validatePDF(buffer) {
        const pdfSignature = buffer.slice(0, 4).toString();
        return pdfSignature === '%PDF';
    }
    async analyzePDFStructure(text) {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const endpointPatterns = [
            /POST|GET|PUT|DELETE|PATCH/i,
            /\/api\//i,
            /endpoint|route|path/i,
            /https?:\/\//i
        ];
        const authPatterns = [
            /authentication|auth|token|api key|bearer/i,
            /authorization|credential|secret/i,
            /oauth|jwt|basic auth/i
        ];
        const examplePatterns = [
            /example|sample|demo/i,
            /curl|request|response/i,
            /json|xml|payload/i
        ];
        const hasEndpoints = lines.some(line => endpointPatterns.some(pattern => pattern.test(line)));
        const hasAuthentication = lines.some(line => authPatterns.some(pattern => pattern.test(line)));
        const hasExamples = lines.some(line => examplePatterns.some(pattern => pattern.test(line)));
        const sections = this.extractSections(text);
        return {
            hasEndpoints,
            hasAuthentication,
            hasExamples,
            sections
        };
    }
    extractSections(text) {
        const sectionHeaders = text.match(/^[A-Z\s]{2,}$/gm) || [];
        return sectionHeaders.map(header => header.trim()).slice(0, 10);
    }
}
exports.PDFService = PDFService;
//# sourceMappingURL=pdf.service.js.map