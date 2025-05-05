import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import logger from '@/lib/logger';
import { Pool } from 'pg';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Initialize database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Monitor database pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
    type: error.name
  });
  
  // Give logger time to write before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined
  });
});

// Handle process warnings
process.on('warning', (warning) => {
  logger.warn('Process Warning:', {
    name: warning.name,
    message: warning.message,
    stack: warning.stack
  });
});

// Monitor memory usage
const MEMORY_THRESHOLD = 512 * 1024 * 1024; // 512MB
setInterval(() => {
  const memUsage = process.memoryUsage();
  if (memUsage.heapUsed > MEMORY_THRESHOLD) {
    logger.warn('High memory usage detected:', {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB'
    });
  }
}, 60000); // Check every minute

// Log environment information on startup
logger.info('Server starting:', {
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  env: process.env.NODE_ENV,
  pid: process.pid
});

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      logger.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  server.listen(port, () => {
    logger.info(`Server listening on port ${port}`);
  });
});

export { pool }; 