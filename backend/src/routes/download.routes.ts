import { Router } from 'express';
import { processingQueue } from '../services/queue-singleton';
import { ZipGeneratorService } from '../services/zip-generator.service';
import { createError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const router = Router();
const zipGenerator = new ZipGeneratorService();

router.get('/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      throw createError('Job ID is required', 400, 'MISSING_JOB_ID');
    }

    const jobResult = await processingQueue.getJobResult(jobId);
    
    if (!jobResult) {
      throw createError('Job not found', 404, 'JOB_NOT_FOUND');
    }

    if (jobResult.status !== 'completed' || !jobResult.generatedSDK) {
      throw createError('SDK not available for download', 400, 'SDK_NOT_READY');
    }

    logger.info(`Generating ZIP for job ${jobId}`);

    const zipBuffer = await zipGenerator.createSDKZip(jobResult.generatedSDK);
    const filename = `${jobResult.generatedSDK.providerName.toLowerCase().replace(/\s+/g, '-')}-sdk.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', zipBuffer.length);

    logger.info(`Serving ZIP download for job ${jobId}: ${filename}`);

    res.send(zipBuffer);

  } catch (error) {
    next(error);
  }
});

export { router as downloadRouter };