"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadRouter = void 0;
const express_1 = require("express");
const queue_singleton_1 = require("../services/queue-singleton");
const zip_generator_service_1 = require("../services/zip-generator.service");
const error_middleware_1 = require("../middleware/error.middleware");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
exports.downloadRouter = router;
const zipGenerator = new zip_generator_service_1.ZipGeneratorService();
router.get('/:jobId', async (req, res, next) => {
    try {
        const { jobId } = req.params;
        if (!jobId) {
            throw (0, error_middleware_1.createError)('Job ID is required', 400, 'MISSING_JOB_ID');
        }
        const jobResult = await queue_singleton_1.processingQueue.getJobResult(jobId);
        if (!jobResult) {
            throw (0, error_middleware_1.createError)('Job not found', 404, 'JOB_NOT_FOUND');
        }
        if (jobResult.status !== 'completed' || !jobResult.generatedSDK) {
            throw (0, error_middleware_1.createError)('SDK not available for download', 400, 'SDK_NOT_READY');
        }
        logger_1.logger.info(`Generating ZIP for job ${jobId}`);
        const zipBuffer = await zipGenerator.createSDKZip(jobResult.generatedSDK);
        const filename = `${jobResult.generatedSDK.providerName.toLowerCase().replace(/\s+/g, '-')}-sdk.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', zipBuffer.length);
        logger_1.logger.info(`Serving ZIP download for job ${jobId}: ${filename}`);
        res.send(zipBuffer);
    }
    catch (error) {
        next(error);
    }
});
//# sourceMappingURL=download.routes.js.map