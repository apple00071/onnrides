import logger from '@/lib/logger';

interface UserStatusMessage {
  type: 'user_status';
  userId: string;
  action: 'blocked' | 'deleted';
}

declare global {
  var wss: {
    notifyUser: (userId: string, message: any) => void;
  };
}

class WebSocketService {
  private static instance: WebSocketService;

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  public notifyUserStatus(userId: string, action: 'blocked' | 'deleted') {
    try {
      if (global.wss) {
        const message: UserStatusMessage = {
          type: 'user_status',
          userId,
          action
        };
        
        global.wss.notifyUser(userId, message);
        logger.info('User status notification sent:', { userId, action });
      } else {
        logger.warn('WebSocket server not initialized');
      }
    } catch (error) {
      logger.error('Error sending user status notification:', error);
    }
  }
}

export default WebSocketService; 