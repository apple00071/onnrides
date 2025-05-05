import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    logger.warn('API Error:', {
      statusCode: error.statusCode,
      message: error.message,
      code: error.code,
      details: error.details
    });

    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code,
          details: error.details
        }
      },
      { status: error.statusCode }
    );
  }

  // Handle unknown errors
  logger.error('Unhandled API Error:', error);
  
  return NextResponse.json(
    {
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      }
    },
    { status: 500 }
  );
}

export function createApiError(
  statusCode: number,
  message: string,
  code?: string,
  details?: any
) {
  return new ApiError(statusCode, message, code, details);
} 