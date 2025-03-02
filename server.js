const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');
const http = require('http');

// Configure environment before importing other modules
const dotenvPath = path.resolve(process.cwd(), '.env');
require('dotenv').config({ path: dotenvPath });

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Simple server logger
const serverLogger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message, err) => console.error(`[ERROR] ${message}`, err),
  warn: (message) => console.warn(`[WARN] ${message}`),
  debug: (message) => dev ? console.debug(`[DEBUG] ${message}`) : null
};

// Import shutdown manager
const shutdownManager = (() => {
  try {
    return require('./lib/shutdown-manager').default;
  } catch (err) {
    serverLogger.warn('Could not load shutdown manager, using fallback');
    // Simple fallback if shutdown manager can't be loaded
    return {
      registerHandler: () => {},
      shutdown: async () => {}
    };
  }
})();

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Helper function to initialize settings
function initializeSettings() {
  setTimeout(() => {
    try {
      // Make a request to the settings initialization endpoint
      const req = http.request({
        hostname: 'localhost',
        port: port,
        path: '/api/settings/initialize',
        method: 'GET'
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            serverLogger.info('Settings initialized successfully');
          } else {
            serverLogger.warn('Settings initialization returned status:', res.statusCode);
          }
        });
      });
      
      req.on('error', (error) => {
        serverLogger.warn('Failed to initialize settings:', error.message);
      });
      
      req.end();
    } catch (err) {
      serverLogger.warn('Could not initialize settings:', err.message);
    }
  }, 2000); // Wait 2 seconds for the server to start
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      serverLogger.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  server.listen(port, () => {
    serverLogger.info(`> Server ready on http://${hostname}:${port}`);
    
    // Initialize settings after server starts
    initializeSettings();
  });

  // Register server shutdown with the shutdown manager
  shutdownManager.registerHandler(
    'http-server',
    async () => {
      return new Promise((resolve, reject) => {
        serverLogger.info('Closing HTTP server...');
        server.close((err) => {
          if (err) {
            serverLogger.error('Error closing HTTP server:', err);
            reject(err);
          } else {
            serverLogger.info('HTTP server closed successfully');
            resolve();
          }
        });
        
        // Force close after timeout
        setTimeout(() => {
          serverLogger.warn('Forcing HTTP server close after timeout');
          resolve();
        }, 5000);
      });
    },
    'web', // phase
    1      // priority (lower number = higher priority)
  );

  // Initialize database
  try {
    const db = (() => {
      try {
        return require('./lib/db');
      } catch (err) {
        serverLogger.warn('Could not load database module:', err.message);
        return {
          initializeDatabase: async () => {},
          pool: { end: async () => {} }
        };
      }
    })();
    
    // Register database shutdown
    shutdownManager.registerHandler(
      'postgres-pool',
      async () => {
        serverLogger.info('Closing PostgreSQL connection pool...');
        try {
          await db.pool.end();
          serverLogger.info('PostgreSQL connection pool closed successfully');
        } catch (error) {
          // Ignore "called end more than once" errors
          if (error.message !== 'Called end on pool more than once') {
            serverLogger.error('Error closing PostgreSQL pool:', error);
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
        const prisma = (() => {
          try {
            const imported = require('./lib/prisma');
            return imported.default || imported;
          } catch (err) {
            serverLogger.warn('Could not load Prisma module:', err.message);
            return { $disconnect: async () => {} };
          }
        })();
        
        serverLogger.info('Disconnecting Prisma client...');
        try {
          await prisma.$disconnect();
          serverLogger.info('Prisma client disconnected successfully');
        } catch (error) {
          serverLogger.error('Error disconnecting Prisma client:', error);
          throw error;
        }
      },
      'databases', // phase
      10          // priority
    );
    
    // Initialize the database
    db.initializeDatabase()
      .then(() => serverLogger.info('Database initialized successfully'))
      .catch(err => serverLogger.error('Failed to initialize database:', err));
  } catch (err) {
    serverLogger.error('Error setting up database:', err);
  }
}); 