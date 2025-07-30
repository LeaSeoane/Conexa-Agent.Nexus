"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisRouter = void 0;
const express_1 = require("express");
const queue_singleton_1 = require("../services/queue-singleton");
const error_middleware_1 = require("../middleware/error.middleware");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
exports.analysisRouter = router;
router.get('/:jobId', async (req, res, next) => {
    try {
        const { jobId } = req.params;
        if (!jobId) {
            throw (0, error_middleware_1.createError)('Job ID is required', 400, 'MISSING_JOB_ID');
        }
        const jobStatus = await queue_singleton_1.processingQueue.getJobStatus(jobId);
        if (!jobStatus) {
            throw (0, error_middleware_1.createError)('Job not found', 404, 'JOB_NOT_FOUND');
        }
        logger_1.logger.info(`Retrieved status for job ${jobId}: ${jobStatus.status}`);
        res.json({
            success: true,
            jobId,
            status: jobStatus.status,
            progress: jobStatus.progress,
            message: jobStatus.message,
            ...(jobStatus.error && { error: jobStatus.error })
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/:jobId/result', async (req, res, next) => {
    try {
        const { jobId } = req.params;
        if (!jobId) {
            throw (0, error_middleware_1.createError)('Job ID is required', 400, 'MISSING_JOB_ID');
        }
        const jobResult = await queue_singleton_1.processingQueue.getJobResult(jobId);
        if (!jobResult) {
            throw (0, error_middleware_1.createError)('Job not found or not completed', 404, 'JOB_NOT_FOUND');
        }
        if (jobResult.status !== 'completed') {
            throw (0, error_middleware_1.createError)('Job not completed yet', 400, 'JOB_NOT_COMPLETED');
        }
        logger_1.logger.info(`Retrieved result for job ${jobId}`);
        res.json({
            success: true,
            jobId,
            analysis: jobResult.result,
            generatedSDK: jobResult.generatedSDK
        });
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=analysis.routes.js.map