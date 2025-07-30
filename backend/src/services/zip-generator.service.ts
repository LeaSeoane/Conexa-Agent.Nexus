import JSZip from 'jszip';
import { GeneratedSDK } from '../types';
import { logger } from '../utils/logger';

export class ZipGeneratorService {
  async createSDKZip(sdk: GeneratedSDK): Promise<Buffer> {
    try {
      logger.info(`Creating ZIP package for ${sdk.providerName} SDK`);

      const zip = new JSZip();

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

      logger.info(`Successfully created ZIP package: ${zipBuffer.length} bytes`);
      return zipBuffer;

    } catch (error) {
      logger.error('Failed to create ZIP package:', error);
      throw new Error('Failed to generate SDK package');
    }
  }
}