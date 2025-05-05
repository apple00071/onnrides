import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

type ApiHandler = (req: NextRequest) => Promise<NextResponse> | NextResponse;

export function withErrorHandler(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest) => {
    try {
      // Log incoming request
      logger.info('API Request:', {
        method: req.method,
        url: req.url,
        path: new URL(req.url).pathname,
        headers: Object.fromEntries(req.headers)
      });

      // Execute the handler
      const response = await handler(req);

      // Log successful response
      logger.info('API Response:', {
        status: response.status,
        url: req.url,
        path: new URL(req.url).pathname
      });

      return response;
    } catch (error) {
      // Log detailed error information
      logger.error('API Error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : typeof error,
        url: req.url,
        method: req.method,
        path: new URL(req.url).pathname
      });

      // Handle specific error types
      if (error instanceof Error) {
        switch (error.constructor.name) {
          case 'ValidationError':
            return NextResponse.json(
              { error: 'Validation Error', details: error.message },
              { status: 400 }
            );
          case 'AuthenticationError':
            return NextResponse.json(
              { error: 'Authentication Error', message: error.message },
              { status: 401 }
            );
          case 'AuthorizationError':
            return NextResponse.json(
              { error: 'Authorization Error', message: error.message },
              { status: 403 }
            );
          case 'NotFoundError':
            return NextResponse.json(
              { error: 'Not Found', message: error.message },
              { status: 404 }
            );
          default:
            // For unknown errors, return a generic error message in production
            return NextResponse.json(
              {
                error: 'Internal Server Error',
                message: process.env.NODE_ENV === 'development' 
                  ? error.message 
                  : 'An unexpected error occurred'
              },
              { status: 500 }
            );
        }
      }

      // For non-Error objects
      return NextResponse.json(
        { 
          error: 'Internal Server Error',
          message: 'An unexpected error occurred'
        },
        { status: 500 }
      );
    }
  };
}

// Custom error classes
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
} 