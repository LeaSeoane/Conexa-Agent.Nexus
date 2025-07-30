import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { processingQueue } from '../services/queue-singleton';
import { createError } from '../middleware/error.middleware';
import { logger } from '../utils/logger';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(createError('Only PDF files are allowed', 400, 'INVALID_FILE_TYPE') as any, false);
    }
  }
});

router.post('/pdf', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw createError('No file uploaded', 400, 'NO_FILE');
    }

    const { providerName } = req.body;
    if (!providerName || providerName.trim().length === 0) {
      throw createError('Provider name is required', 400, 'MISSING_PROVIDER_NAME');
    }

    const jobId = uuidv4();
    
    logger.info(`Starting PDF processing job ${jobId} for provider: ${providerName}`);

    const job = await processingQueue.addPDFJob({
      jobId,
      providerName: providerName.trim(),
      fileBuffer: req.file.buffer,
      filename: req.file.originalname
    });

    res.status(202).json({
      success: true,
      jobId,
      message: 'File uploaded successfully, processing started',
      status: 'pending'
    });

  } catch (error) {
    next(error);
  }
});

router.post('/url', async (req, res, next) => {
  try {
    const { url, providerName } = req.body;

    if (!url || !providerName) {
      throw createError('URL and provider name are required', 400, 'MISSING_REQUIRED_FIELDS');
    }

    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(url)) {
      throw createError('Invalid URL format', 400, 'INVALID_URL');
    }

    const jobId = uuidv4();
    
    logger.info(`Starting URL processing job ${jobId} for provider: ${providerName}`);

    const job = await processingQueue.addURLJob({
      jobId,
      providerName: providerName.trim(),
      url: url.trim()
    });

    res.status(202).json({
      success: true,
      jobId,
      message: 'URL submitted successfully, processing started',
      status: 'pending'
    });

  } catch (error) {
    next(error);
  }
});

export { router as uploadRouter };