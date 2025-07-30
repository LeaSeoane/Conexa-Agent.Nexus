"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const uuid_1 = require("uuid");
const queue_singleton_1 = require("../services/queue-singleton");
const error_middleware_1 = require("../middleware/error.middleware");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
exports.uploadRouter = router;
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb((0, error_middleware_1.createError)('Only PDF files are allowed', 400, 'INVALID_FILE_TYPE'), false);
        }
    }
});
router.post('/pdf', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            throw (0, error_middleware_1.createError)('No file uploaded', 400, 'NO_FILE');
        }
        const { providerName } = req.body;
        if (!providerName || providerName.trim().length === 0) {
            throw (0, error_middleware_1.createError)('Provider name is required', 400, 'MISSING_PROVIDER_NAME');
        }
        const jobId = (0, uuid_1.v4)();
        logger_1.logger.info(`Starting PDF processing job ${jobId} for provider: ${providerName}`);
        const job = await queue_singleton_1.processingQueue.addPDFJob({
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
    }
    catch (error) {
        next(error);
    }
});
router.post('/url', async (req, res, next) => {
    try {
        const { url, providerName } = req.body;
        if (!url || !providerName) {
            throw (0, error_middleware_1.createError)('URL and provider name are required', 400, 'MISSING_REQUIRED_FIELDS');
        }
        const urlPattern = /^https?:\/\/.+/i;
        if (!urlPattern.test(url)) {
            throw (0, error_middleware_1.createError)('Invalid URL format', 400, 'INVALID_URL');
        }
        const jobId = (0, uuid_1.v4)();
        logger_1.logger.info(`Starting URL processing job ${jobId} for provider: ${providerName}`);
        const job = await queue_singleton_1.processingQueue.addURLJob({
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
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=upload.routes.js.map