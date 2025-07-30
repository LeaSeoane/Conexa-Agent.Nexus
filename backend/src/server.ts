import { server } from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3002;

server.listen(PORT, () => {
  logger.info(`🚀 Conexa Integration Generator Backend running on port ${PORT}`);
  logger.info(`📁 Upload endpoint: http://localhost:${PORT}/api/upload`);
  logger.info(`📊 Analysis endpoint: http://localhost:${PORT}/api/analysis`);
  logger.info(`⬇️  Download endpoint: http://localhost:${PORT}/api/download`);
});