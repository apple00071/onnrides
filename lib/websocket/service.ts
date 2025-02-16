import { Server as HTTPServer } from 'http';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import WebSocket from 'ws';
import { parse } from 'url';
import logger from '@/lib/logger';

interface UserStatusMessage {
  type: 'user_status';
  userId: string;
  action: 'blocked' | 'deleted';
}

declare global {
  var wss: WebSocket.Server;
}

class WebSocketService {
  private static instance: WebSocketService;
  private wss: WebSocket.Server | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly isDev = process.env.NODE_ENV !== 'production';

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public initialize(server: HTTPServer) {
    if (this.wss) {
      logger.warn('WebSocket server already initialized');
      return;
    }

    try {
      // Create WebSocket server without attaching it to HTTP server yet
      this.wss = new WebSocket.Server({ 
        noServer: true // Important: Use noServer: true
      });

      this.setupWebSocketServer();

      // Handle upgrade requests
      server.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
        try {
          const parsedUrl = parse(request.url || '', true);
          const { pathname } = parsedUrl;

          if (pathname !== '/ws') {
            socket.destroy();
            return;
          }

          // In development, log the upgrade request
          if (this.isDev) {
            logger.debug('Handling WebSocket upgrade request:', {
              path: pathname,
              headers: request.headers,
              env: process.env.NODE_ENV
            });
          }

          this.wss!.handleUpgrade(request, socket, head, (ws) => {
            this.wss!.emit('connection', ws, request);
          });
        } catch (error) {
          logger.error('Error in upgrade handler:', error);
          if (!socket.destroyed) {
            socket.destroy();
          }
        }
      });

      logger.info('WebSocket server initialized successfully', {
        env: process.env.NODE_ENV,
        isDev: this.isDev
      });
    } catch (error) {
      logger.error('Error initializing WebSocket server:', error);
      throw error;
    }
  }

  private setupWebSocketServer() {
    if (!this.wss) return;

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      try {
        const parsedUrl = parse(req.url || '', true);
        const userId = parsedUrl.query.userId as string;

        if (!userId) {
          logger.warn('WebSocket connection attempt without userId');
          ws.close();
          return;
        }

        logger.info('WebSocket client connected:', { 
          userId,
          env: process.env.NODE_ENV
        });

        // Store the connection
        (ws as any).userId = userId;
        (ws as any).isAlive = true;

        // Send connection confirmation
        ws.send(JSON.stringify({ 
          type: 'connection', 
          status: 'connected',
          env: this.isDev ? 'development' : 'production'
        }));

        ws.on('pong', () => {
          (ws as any).isAlive = true;
        });

        ws.on('close', () => {
          (ws as any).isAlive = false;
          logger.info('WebSocket client disconnected:', { userId });
        });

        ws.on('error', (error) => {
          logger.error('WebSocket error:', { userId, error: error.message });
        });
      } catch (error) {
        logger.error('Error in connection handler:', error);
        ws.close();
      }
    });

    // Setup ping interval
    this.setupPingInterval();

    this.wss.on('close', () => {
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
    });
  }

  private setupPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (!this.wss) return;

      this.wss.clients.forEach((ws) => {
        if ((ws as any).isAlive === false) {
          logger.info('Terminating inactive connection:', { 
            userId: (ws as any).userId,
            env: process.env.NODE_ENV
          });
          return ws.terminate();
        }

        (ws as any).isAlive = false;
        ws.ping(() => {});
      });
    }, 30000);
  }

  public notifyUserStatus(userId: string, action: 'blocked' | 'deleted') {
    if (!this.wss) {
      logger.warn('WebSocket server not initialized');
      return;
    }

    const message: UserStatusMessage = {
      type: 'user_status',
      userId,
      action
    };

    let notified = false;
    this.wss.clients.forEach((client) => {
      if ((client as any).userId === userId && client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
          notified = true;
          logger.info('User status notification sent:', { 
            userId, 
            action,
            env: process.env.NODE_ENV
          });
        } catch (error) {
          logger.error('Error sending user status notification:', error);
        }
      }
    });

    if (!notified) {
      logger.warn('No active connection found for user:', { 
        userId, 
        action,
        env: process.env.NODE_ENV
      });
    }
  }
}

export default WebSocketService; 