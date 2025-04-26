import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

/**
 * Route handler for registration - redirects to signup
 * This maintains backward compatibility with any existing code using the /register endpoint
 */
export async function POST(req: NextRequest) {
  // Forward the request to the signup endpoint
  const signupUrl = new URL('/api/auth/signup', req.url);
  
  try {
    // Clone the request to forward it
    const body = await req.json();
    
    logger.info('Register endpoint called - redirecting to signup', {
      email: body.email,
      signupUrl: signupUrl.toString()
    });
    
    // Forward the request to the signup endpoint
    const response = await fetch(signupUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Get the response data
    const data = await response.json();
    
    logger.info('Signup response received', {
      status: response.status,
      success: response.ok,
      userId: data.user?.id
    });
    
    // Return the response from the signup endpoint
    return NextResponse.json(data, { status: response.status });
  } catch (error: unknown) {
    console.error("Database error during signup:", error);
    // Check for type mismatch errors
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === "42804" || 
        typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' && error.message.includes("type mismatch")) {
      return NextResponse.json({ error: "Type mismatch in database operation" }, { status: 500 });
    }
    logger.error('Error forwarding request to signup:', error);
    return NextResponse.json(
      { error: 'Failed to process registration' },
      { status: 500 }
    );
  }
} 