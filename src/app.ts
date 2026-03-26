import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { connectDatabase, closeDatabase } from './config/database';
import { validateSignature } from './middleware/signatureValidator';
import { handleTokenGeneration } from './controllers/tokenController';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const app = express();
const port = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Token generation endpoint
app.post('/api/token', validateSignature, handleTokenGeneration);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 'MF',
    message: 'Endpoint not found'
  });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    status: 'MF',
    message: 'Internal server error'
  });
});

// Start server
async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    
    app.listen(port, () => {
      console.log(`
      ═══════════════════════════════════════════════
      ✅ Token System Server Started Successfully
      ═══════════════════════════════════════════════
      📡 Port: ${port}
      🌍 Environment: ${process.env.NODE_ENV || 'development'}
      🔗 Health Check: http://localhost:${port}/health
      🔑 Token Endpoint: http://localhost:${port}/api/token
      ═══════════════════════════════════════════════
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

export default app;