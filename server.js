const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');

// Configure environment before importing other modules
const dotenvPath = path.resolve(process.cwd(), '.env');
require('dotenv').config({ path: dotenvPath });

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Import logger and shutdown manager after environment is configured
const logger = require('./lib/logger').default;
const shutdownManager = require('./lib/shutdown-manager').default;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      logger.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  server.listen(port, () => {
    logger.info(`> Server ready on http://${hostname}:${port}`);
  });

  // Register server shutdown with the shutdown manager
  shutdownManager.registerHandler(
    'http-server',
    async () => {
      return new Promise((resolve, reject) => {
        logger.info('Closing HTTP server...');
        server.close((err) => {
          if (err) {
            logger.error('Error closing HTTP server:', err);
            reject(err);
          } else {
            logger.info('HTTP server closed successfully');
            resolve();
          }
        });
        
        // Force close after timeout
        setTimeout(() => {
          logger.warn('Forcing HTTP server close after timeout');
          resolve();
        }, 5000);
      });
    },
    'web', // phase
    1      // priority (lower number = higher priority)
  );

  // Initialize database
  try {
    const { initializeDatabase } = require('./lib/db');
    
    // Register database shutdown
    shutdownManager.registerHandler(
      'postgres-pool',
      async () => {
        const { pool } = require('./lib/db');
        logger.info('Closing PostgreSQL connection pool...');
        try {
          await pool.end();
          logger.info('PostgreSQL connection pool closed successfully');
        } catch (error) {
          // Ignore "called end more than once" errors
          if (error.message !== 'Called end on pool more than once') {
            logger.error('Error closing PostgreSQL pool:', error);
            throw error;
          }
        }
      },
      'databases', // phase
      5           // priority
    );

    // Register Prisma shutdown
    shutdownManager.registerHandler(
      'prisma-client',
      async () => {
        const prisma = require('./lib/prisma').default;
        logger.info('Disconnecting Prisma client...');
        try {
          await prisma.$disconnect();
          logger.info('Prisma client disconnected successfully');
        } catch (error) {
          logger.error('Error disconnecting Prisma client:', error);
          throw error;
        }
      },
      'databases', // phase
      10          // priority
    );
    
    // Initialize the database
    initializeDatabase()
      .then(() => logger.info('Database initialized successfully'))
      .catch(err => logger.error('Failed to initialize database:', err));
  } catch (err) {
    logger.error('Error setting up database:', err);
  }
}); 