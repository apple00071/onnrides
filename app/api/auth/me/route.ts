import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request.cookies);
    
    if (!user) {
      console.log('No authenticated user found');
      return NextResponse.json(
        { message: 'Not authenticated', error: 'No valid session found' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isDocumentsVerified: user.isDocumentsVerified
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        message: 'Failed to check authentication',
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
} 