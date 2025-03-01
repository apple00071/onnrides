/**
 * Shutdown Manager
 * 
 * This module provides centralized management of application shutdown processes.
 * It ensures resources are properly closed in the correct order with proper error handling.
 */
import logger from './logger';

type ShutdownHandler = () => Promise<void>;
type ShutdownPhase = 'web' | 'services' | 'databases' | 'final';

interface RegisteredHandler {
  handler: ShutdownHandler;
  phase: ShutdownPhase;
  name: string;
  priority: number;
}

class ShutdownManager {
  private static instance: ShutdownManager;
  private handlers: RegisteredHandler[] = [];
  private isShuttingDown = false;
  private hasRegisteredProcessHandlers = false;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): ShutdownManager {
    if (!ShutdownManager.instance) {
      ShutdownManager.instance = new ShutdownManager();
    }
    return ShutdownManager.instance;
  }

  /**
   * Register a handler to be called during application shutdown
   */
  public registerHandler(
    name: string,
    handler: ShutdownHandler,
    phase: ShutdownPhase = 'databases',
    priority: number = 10
  ): void {
    // Don't allow duplicate registrations
    const existingIndex = this.handlers.findIndex(h => h.name === name);
    if (existingIndex >= 0) {
      this.handlers[existingIndex] = { handler, phase, name, priority };
      logger.debug(`Updated shutdown handler: ${name}`);
    } else {
      this.handlers.push({ handler, phase, name, priority });
      logger.debug(`Registered shutdown handler: ${name}`);
    }

    // Register process handlers if not already done
    if (!this.hasRegisteredProcessHandlers) {
      this.registerProcessHandlers();
    }
  }

  /**
   * Initiate application shutdown
   */
  public async shutdown(signal?: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.info('Shutdown already in progress, ignoring duplicate request');
      return;
    }

    this.isShuttingDown = true;
    logger.info(`Application shutdown initiated${signal ? ` by ${signal}` : ''}`);
    
    // Define the execution order of phases
    const phases: ShutdownPhase[] = ['web', 'services', 'databases', 'final'];
    
    // Execute handlers in each phase
    for (const phase of phases) {
      logger.info(`Executing shutdown phase: ${phase}`);
      
      // Get handlers for this phase and sort by priority
      const phaseHandlers = this.handlers
        .filter(h => h.phase === phase)
        .sort((a, b) => a.priority - b.priority);
      
      // Execute handlers in sequence
      for (const { handler, name } of phaseHandlers) {
        try {
          logger.debug(`Executing shutdown handler: ${name}`);
          await handler();
          logger.debug(`Shutdown handler completed: ${name}`);
        } catch (error: any) {
          logger.error(`Error in shutdown handler ${name}:`, { 
            error: error.message,
            stack: error.stack
          });
        }
      }
    }
    
    logger.info('Application shutdown complete');
  }

  /**
   * Register process signal handlers
   */
  private registerProcessHandlers(): void {
    // SIGTERM is sent when the process is terminated
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received');
      this.shutdown('SIGTERM').catch(error => {
        logger.error('Error during SIGTERM shutdown:', error);
        process.exit(1);
      });
    });

    // SIGINT is sent when the user presses Ctrl+C
    process.on('SIGINT', () => {
      logger.info('SIGINT received');
      this.shutdown('SIGINT').catch(error => {
        logger.error('Error during SIGINT shutdown:', error);
        process.exit(1);
      });
    });

    // beforeExit is emitted when Node.js is about to exit
    process.on('beforeExit', () => {
      logger.info('beforeExit event');
      this.shutdown('beforeExit').catch(error => {
        logger.error('Error during beforeExit shutdown:', error);
        process.exit(1);
      });
    });

    // uncaughtException is emitted when an uncaught exception occurs
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', { error });
      this.shutdown('uncaughtException').catch(err => {
        logger.error('Error during uncaughtException shutdown:', err);
        process.exit(1);
      });
    });

    // unhandledRejection is emitted when a Promise rejection is not handled
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection:', { reason, promise });
      // We don't exit here as this is often not fatal
    });

    this.hasRegisteredProcessHandlers = true;
    logger.info('Process shutdown handlers registered');
  }
}

export default ShutdownManager.getInstance(); 