import winston from 'winston';

// Define log levels as a const enum for better type safety
const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const;

type LogLevel = typeof LogLevel[keyof typeof LogLevel];

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

interface ErrorInfo {
  message: string;
  code?: string;
  stack?: string;
  opensslErrorStack?: string;
  library?: string;
  function?: string;
  reason?: string;
}

interface EmailErrorInfo extends ErrorInfo {
  emailType?: string;
  recipient?: string;
  subject?: string;
  smtpResponse?: string;
  transportError?: string;
}

// Create error formatter
const formatError = (error: any): string => {
  if (!error) return '';
  
  const errorInfo: ErrorInfo = {
    message: error.message || error.toString(),
    code: error.code,
    stack: error.stack,
    // SSL/TLS specific error properties
    opensslErrorStack: error.opensslErrorStack,
    library: error.library,
    function: error.function,
    reason: error.reason,
  };

  return JSON.stringify(errorInfo, null, 2);
};

// Create email error formatter
const formatEmailError = (error: any, emailType?: string): string => {
  if (!error) return '';
  
  const errorInfo: EmailErrorInfo = {
    message: error.message || error.toString(),
    code: error.code,
    stack: error.stack,
    emailType,
    recipient: error.recipient,
    subject: error.subject,
    smtpResponse: error.response,
    transportError: error.transportError,
  };

  return JSON.stringify(errorInfo, null, 2);
};

// Create logger interface
interface Logger {
  error: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
  emailError: (message: string, error: any, metadata?: Record<string, any>) => void;
  bookingEmailError: (message: string, error: any, bookingId: string, metadata?: Record<string, any>) => void;
  sslError: (message: string, error: any, metadata?: Record<string, any>) => void;
}

// Create a unified logger that works in all environments
const createLogger = (): Logger => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isBrowser = typeof window !== 'undefined';
  const isEdgeRuntime = process.env.NEXT_RUNTIME === 'edge';

  // Helper to format log entries
  const formatLogEntry = (level: string, message: string, args: any[] = []) => {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    ).join(' ');
    return `[${timestamp}] ${(level || 'INFO').toUpperCase()}: ${message} ${formattedArgs}`.trim();
  };

  // Helper to determine if we should log based on environment
  const shouldLog = (level: LogLevel): boolean => {
    if (!isDevelopment && (level === LogLevel.DEBUG || level === LogLevel.INFO)) {
      return false;
    }
    return true;
  };

  // Core logging function
  const log = (level: LogLevel, message: string, ...args: any[]) => {
    // In production, we'll just store the logs for potential external service integration
    if (!isDevelopment) {
      // TODO: Integrate with external logging service if needed
      // Example: sendToExternalService(level, message, args);
      return;
    }

    // Only log to console in development
    const formattedMessage = formatLogEntry(LogLevel[level], message, args);
    
    if (isBrowser || isEdgeRuntime) {
      switch (level) {
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
      }
    } else {
      // Server-side development logging
      console.log(formattedMessage);
    }
  };

  return {
    error: (message: string, ...args: any[]) => log(LogLevel.ERROR, message, ...args),
    warn: (message: string, ...args: any[]) => log(LogLevel.WARN, message, ...args),
    info: (message: string, ...args: any[]) => log(LogLevel.INFO, message, ...args),
    debug: (message: string, ...args: any[]) => log(LogLevel.DEBUG, message, ...args),
    emailError: (message: string, error: any, metadata = {}) => {
      log(LogLevel.ERROR, message, {
        error: formatEmailError(error),
        metadata: {
          ...metadata,
          category: 'email',
          errorType: error?.code || 'EMAIL_ERROR',
        },
      });
    },
    bookingEmailError: (message: string, error: any, bookingId: string, metadata = {}) => {
      log(LogLevel.ERROR, message, {
        error: formatEmailError(error, 'booking-confirmation'),
        metadata: {
          ...metadata,
          category: 'email',
          emailType: 'booking-confirmation',
          bookingId,
          errorType: error?.code || 'BOOKING_EMAIL_ERROR',
        },
      });
    },
    sslError: (message: string, error: any, metadata = {}) => {
      log(LogLevel.ERROR, message, {
        error: formatError(error),
        metadata: {
          ...metadata,
          category: 'ssl',
          errorType: error?.code || 'SSL_ERROR',
          opensslErrorStack: error?.opensslErrorStack,
        },
      });
    },
  };
};

// Create a singleton logger instance
const logger = createLogger();

// Create a stream object for HTTP request logging
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger; 