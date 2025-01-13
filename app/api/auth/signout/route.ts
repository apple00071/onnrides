import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ 
      message: 'Signed out successfully',
      status: 200 
    });

    // Clear session cookies with appropriate options
    response.cookies.set('next-auth.session-token', '', { maxAge: 0 });
    response.cookies.set('next-auth.csrf-token', '', { maxAge: 0 });
    response.cookies.set('next-auth.callback-url', '', { maxAge: 0 });

    return response;
  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json(
      { error: 'Failed to sign out' },
      { status: 500 }
    );
  }
} 