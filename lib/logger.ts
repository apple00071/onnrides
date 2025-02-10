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
  info: (message: string, ...args: any[]) => {},  // No-op in production
  debug: (message: string, ...args: any[]) => {}, // No-op in production
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
  // Only log in development
  if (process.env.NODE_ENV !== 'development') {
    return {
      error: (message: string, ...args: any[]) => {},
      warn: (message: string, ...args: any[]) => {},
      info: (message: string, ...args: any[]) => {},
      debug: (message: string, ...args: any[]) => {},
      emailError: (message: string, error: any, metadata = {}) => {},
      bookingEmailError: (message: string, error: any, bookingId: string, metadata = {}) => {},
      sslError: (message: string, error: any, metadata = {}) => {},
    };
  }

  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.simple(),
      })
    ],
  });

  return {
    error: (message: string, ...args: any[]) => logger.error(message, ...args),
    warn: (message: string, ...args: any[]) => logger.warn(message, ...args),
    info: (message: string, ...args: any[]) => logger.info(message, ...args),
    debug: (message: string, ...args: any[]) => logger.debug(message, ...args),
    emailError: (message: string, error: any, metadata = {}) => {
      logger.error(message, {
        error,
        metadata: {
          ...metadata,
          category: 'email',
          errorType: error?.code || 'EMAIL_ERROR',
        },
      });
    },
    bookingEmailError: (message: string, error: any, bookingId: string, metadata = {}) => {
      logger.error(message, {
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
      logger.error(message, {
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