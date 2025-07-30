"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZipGeneratorService = void 0;
const jszip_1 = __importDefault(require("jszip"));
const logger_1 = require("../utils/logger");
class ZipGeneratorService {
    async createSDKZip(sdk) {
        try {
            logger_1.logger.info(`Creating ZIP package for ${sdk.providerName} SDK`);
            const zip = new jszip_1.default();
            for (const file of sdk.files) {
                const filePath = file.path.startsWith('/') ? file.path.slice(1) : file.path;
                zip.file(filePath, file.content);
            }
            zip.file('package.json', JSON.stringify(sdk.packageJson, null, 2));
            zip.file('README.md', sdk.readme);
            const zipBuffer = await zip.generateAsync({
                type: 'nodebuffer',
                compression: 'DEFLATE',
                compressionOptions: {
                    level: 6
                }
            });
            logger_1.logger.info(`Successfully created ZIP package: ${zipBuffer.length} bytes`);
            return zipBuffer;
        }
        catch (error) {
            logger_1.logger.error('Failed to create ZIP package:', error);
            throw new Error('Failed to generate SDK package');
        }
    }
}
exports.ZipGeneratorService = ZipGeneratorService;
//# sourceMappingURL=zip-generator.service.js.map