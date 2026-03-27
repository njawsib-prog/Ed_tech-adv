// Import config first - this handles environment validation and safe mode detection
import config, { SAFE_MODE } from './config/env';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

// Import routes
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import courseRoutes from './routes/course.routes';
import testRoutes from './routes/test.routes';
import studentRoutes from './routes/student.routes';
import resultsRoutes from './routes/results.routes';
import materialsRoutes from './routes/materials.routes';
import notificationsRoutes from './routes/notifications.routes';
import settingsRoutes from './routes/settings.routes';

// Import queue system
import { closeQueues } from './queue';
import { startAllWorkers, stopAllWorkers } from './queue/workers';

const app = express();

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    environment: config.nodeEnv,
    SAFE_MODE: SAFE_MODE,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/courses', courseRoutes);
app.use('/api/admin/tests', testRoutes);
app.use('/api/admin/results', resultsRoutes);
app.use('/api/admin/materials', materialsRoutes);
app.use('/api/admin/notifications', notificationsRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/student', studentRoutes);

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: config.isProduction ? 'Something went wrong' : err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
const server = app.listen(config.port, () => {
  console.log(`\n🚀 Server running on port ${config.port}`);

  // Start queue workers if not in SAFE MODE and Redis is configured
  if (!SAFE_MODE && config.redisHost) {
    console.log('[Server] Starting queue workers...');
    startAllWorkers();
  } else if (SAFE_MODE) {
    console.log('[Server] Queue workers running in mock mode (SAFE MODE)');
  } else {
    console.log('[Server] Redis not configured, skipping queue workers');
  }
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n[Server] ${signal} received, shutting down gracefully...`);

  // Stop accepting new connections
  server.close(() => {
    console.log('[Server] HTTP server closed');
  });

  // Stop queue workers
  if (!SAFE_MODE && config.redisHost) {
    await stopAllWorkers();
    await closeQueues();
  } else if (SAFE_MODE) {
    console.log('[Server] Closing mock queues...');
    await closeQueues();
  }

  console.log('[Server] Graceful shutdown complete');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;