"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const logger_1 = require("./utils/logger");
const PORT = process.env.PORT || 3002;
app_1.server.listen(PORT, () => {
    logger_1.logger.info(`🚀 Conexa Integration Generator Backend running on port ${PORT}`);
    logger_1.logger.info(`📁 Upload endpoint: http://localhost:${PORT}/api/upload`);
    logger_1.logger.info(`📊 Analysis endpoint: http://localhost:${PORT}/api/analysis`);
    logger_1.logger.info(`⬇️  Download endpoint: http://localhost:${PORT}/api/download`);
});
//# sourceMappingURL=server.js.map