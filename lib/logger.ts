import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

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

// Create a browser-compatible logger
const createBrowserLogger = (): Logger => ({
  error: (message: string, ...args: any[]) => console.error(message, ...args),
  warn: (message: string, ...args: any[]) => console.warn(message, ...args),
  info: (message: string, ...args: any[]) => console.info(message, ...args),
  debug: (message: string, ...args: any[]) => console.debug(message, ...args),
  emailError: (message: string, error: any, metadata = {}) => {
    console.error(message, formatEmailError(error), metadata);
  },
  bookingEmailError: (message: string, error: any, bookingId: string, metadata = {}) => {
    console.error(message, formatEmailError(error, 'booking-confirmation'), { bookingId, ...metadata });
  },
  sslError: (message: string, error: any, metadata = {}) => {
    console.error(message, formatError(error), metadata);
  },
});

// Create a server logger
const createServerLogger = (): Logger => {
  // Add colors to Winston
  winston.addColors(colors);

  // Create formatters
  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
      (info: winston.Logform.TransformableInfo) => {
        const { timestamp, level, message, error, metadata = {} } = info as any;
        
        // Format error based on category
        let errorStr = '';
        if (error) {
          if (metadata?.category === 'email') {
            errorStr = `\nError: ${formatEmailError(error, metadata?.emailType)}`;
          } else {
            errorStr = `\nError: ${formatError(error)}`;
          }
        }
        
        // Format metadata
        const metaStr = Object.keys(metadata).length > 0
          ? `\nMetadata: ${JSON.stringify(metadata, null, 2)}`
          : '';

        return `${timestamp} ${level}: ${message}${errorStr}${metaStr}`;
      }
    )
  );

  // Create the winston logger
  const winstonLogger = winston.createLogger({
    levels,
    format: consoleFormat,
    transports: [
      new winston.transports.Console({
        format: consoleFormat,
        level: 'debug',
      })
    ],
    defaultMeta: {
      service: 'onnrides-api',
      environment: process.env.NODE_ENV || 'development',
    },
  });

  // Add file transports in production
  if (process.env.NODE_ENV !== 'development') {
    import('winston-daily-rotate-file').then((DailyRotateFile) => {
      const fileTransport = new DailyRotateFile.default({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        level: 'debug',
        format: consoleFormat,
      });

      const errorTransport = new DailyRotateFile.default({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        level: 'error',
        format: consoleFormat,
      });

      winstonLogger.add(fileTransport);
      winstonLogger.add(errorTransport);
    }).catch((error) => {
      console.error('Failed to initialize file transports:', error);
    });
  }

  // Create our logger interface implementation
  return {
    error: (message: string, ...args: any[]) => winstonLogger.error(message, ...args),
    warn: (message: string, ...args: any[]) => winstonLogger.warn(message, ...args),
    info: (message: string, ...args: any[]) => winstonLogger.info(message, ...args),
    debug: (message: string, ...args: any[]) => winstonLogger.debug(message, ...args),
    emailError: (message: string, error: any, metadata = {}) => {
      winstonLogger.error(message, {
        error,
        metadata: {
          ...metadata,
          category: 'email',
          errorType: error?.code || 'EMAIL_ERROR',
        },
      });
    },
    bookingEmailError: (message: string, error: any, bookingId: string, metadata = {}) => {
      winstonLogger.error(message, {
        error,
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
      winstonLogger.error(message, {
        error,
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

// Create the appropriate logger based on the environment
const logger = typeof window !== 'undefined' || process.env.NEXT_RUNTIME === 'edge'
  ? createBrowserLogger()
  : createServerLogger();

// Create a stream object for Morgan
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger; 