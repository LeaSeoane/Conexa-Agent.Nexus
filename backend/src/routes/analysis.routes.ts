import { Router } from 'express';
import { processingQueue } from '../services/queue-singleton';
import { createError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const router = Router();

router.get('/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      throw createError('Job ID is required', 400, 'MISSING_JOB_ID');
    }

    const jobStatus = await processingQueue.getJobStatus(jobId);
    
    if (!jobStatus) {
      throw createError('Job not found', 404, 'JOB_NOT_FOUND');
    }

    logger.info(`Retrieved status for job ${jobId}: ${jobStatus.status}`);

    res.json({
      success: true,
      jobId,
      status: jobStatus.status,
      progress: jobStatus.progress,
      message: jobStatus.message,
      ...(jobStatus.error && { error: jobStatus.error })
    });

  } catch (error) {
    next(error);
  }
});

router.get('/:jobId/result', async (req, res, next) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      throw createError('Job ID is required', 400, 'MISSING_JOB_ID');
    }

    const jobResult = await processingQueue.getJobResult(jobId);
    
    if (!jobResult) {
      throw createError('Job not found or not completed', 404, 'JOB_NOT_FOUND');
    }

    if (jobResult.status !== 'completed') {
      throw createError('Job not completed yet', 400, 'JOB_NOT_COMPLETED');
    }

    logger.info(`Retrieved result for job ${jobId}`);

    res.json({
      success: true,
      jobId,
      analysis: jobResult.result,
      generatedSDK: jobResult.generatedSDK
    });

  } catch (error) {
    next(error);
  }
});

export { router as analysisRouter };