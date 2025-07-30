"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const upload_routes_1 = require("./routes/upload.routes");
const analysis_routes_1 = require("./routes/analysis.routes");
const download_routes_1 = require("./routes/download.routes");
const error_middleware_1 = require("./middleware/error.middleware");
const logger_1 = require("./utils/logger");
const queue_singleton_1 = require("./services/queue-singleton");
const app = (0, express_1.default)();
exports.app = app;
const server = (0, http_1.createServer)(app);
exports.server = server;
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
exports.io = io;
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use((req, res, next) => {
    req.io = io;
    next();
});
app.use('/api/upload', upload_routes_1.uploadRouter);
app.use('/api/analysis', analysis_routes_1.analysisRouter);
app.use('/api/download', download_routes_1.downloadRouter);
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
app.use(error_middleware_1.errorHandler);
queue_singleton_1.processingQueue.on('progress', (progress) => {
    io.to(`job-${progress.jobId}`).emit('analysis-progress', progress);
});
io.on('connection', (socket) => {
    logger_1.logger.info(`Client connected: ${socket.id}`);
    socket.on('join-job', (jobId) => {
        socket.join(`job-${jobId}`);
        logger_1.logger.info(`Client ${socket.id} joined job ${jobId}`);
    });
    socket.on('disconnect', () => {
        logger_1.logger.info(`Client disconnected: ${socket.id}`);
    });
});
//# sourceMappingURL=app.js.map