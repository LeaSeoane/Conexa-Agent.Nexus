/// <reference path="./types/express.d.ts" />
import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

console.log('🔧 Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? `SET (${process.env.OPENAI_API_KEY.length} chars)` : 'NOT SET',
  FRONTEND_URL: process.env.FRONTEND_URL
});

// CRITICAL: Detailed API key debugging
console.log('🔑 DETAILED API KEY DEBUG:');
console.log('- API key exists:', !!process.env.OPENAI_API_KEY);
console.log('- API key length:', process.env.OPENAI_API_KEY?.length || 0);
console.log('- API key first 10 chars:', process.env.OPENAI_API_KEY?.substring(0, 10) || 'NONE');
console.log('- API key last 4 chars:', process.env.OPENAI_API_KEY?.slice(-4) || 'NONE');
console.log('- Expected last 4 chars: 2RwA');
console.log('- Keys match expected format:', process.env.OPENAI_API_KEY?.startsWith('sk-proj-') || false);

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { uploadRouter } from './routes/upload.routes';
import { analysisRouter } from './routes/analysis.routes';
import { downloadRouter } from './routes/download.routes';
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';
import { processingQueue } from './services/queue-singleton';

const app = express();
const server = createServer(app);

const allowedOrigins = [
  "http://localhost:3000", 
  "http://localhost:3001",
  process.env.FRONTEND_URL || "http://localhost:3001"
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
  }
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"]
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api/upload', uploadRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/download', downloadRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

processingQueue.on('progress', (progress) => {
  io.to(`job-${progress.jobId}`).emit('analysis-progress', progress);
});

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('join-job', (jobId: string) => {
    socket.join(`job-${jobId}`);
    logger.info(`Client ${socket.id} joined job ${jobId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

export { app, server, io };