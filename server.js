const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const WebSocketService = require('./dist/lib/websocket/service').default;

// Simple logger for server.js
const logger = {
  info: (...args) => console.log(new Date().toISOString(), 'INFO:', ...args),
  error: (...args) => console.error(new Date().toISOString(), 'ERROR:', ...args),
  warn: (...args) => console.warn(new Date().toISOString(), 'WARN:', ...args),
  debug: (...args) => console.debug(new Date().toISOString(), 'DEBUG:', ...args)
};

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

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

  // Handle upgrade requests before initializing WebSocket
  server.on('upgrade', (request, socket, head) => {
    const parsedUrl = parse(request.url, true);
    const { pathname } = parsedUrl;

    if (pathname === '/ws') {
      // Let WebSocket handle this
      return;
    }

    // For all other paths, let Next.js handle it
    if (!socket.destroyed) {
      socket.destroy();
    }
  });

  // Initialize WebSocket service
  const wsService = WebSocketService.getInstance();
  wsService.initialize(server);

  server.listen(port, () => {
    logger.info(`Server listening on port ${port}`);
  });
}); 