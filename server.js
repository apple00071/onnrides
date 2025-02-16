const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const WebSocket = require('ws');
const logger = require('./lib/logger').default;

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

  // Create WebSocket server
  const wss = new WebSocket.Server({ 
    noServer: true // Important: use noServer: true
  });

  // Handle WebSocket connections
  wss.on('connection', (ws, req) => {
    const userId = new URL(req.url, 'http://localhost').searchParams.get('userId');
    
    if (userId) {
      logger.info('WebSocket client connected:', { userId });

      // Store the connection
      ws.userId = userId;

      ws.on('close', () => {
        logger.info('WebSocket client disconnected:', { userId });
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', { userId, error });
      });
    } else {
      ws.close();
    }
  });

  // Handle upgrade requests
  server.on('upgrade', (request, socket, head) => {
    const pathname = parse(request.url).pathname;

    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Broadcast to specific user
  wss.notifyUser = (userId, message) => {
    wss.clients.forEach((client) => {
      if (client.userId === userId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  };

  // Make WebSocket server globally accessible
  global.wss = wss;

  server.listen(port, () => {
    logger.info(`Server listening on port ${port}`);
  });
}); 