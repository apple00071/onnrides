import { NextRequest, NextResponse } from 'next/server';
import { signOut } from 'next-auth/react';

export async function POST(request: NextRequest) {
  try {
    await signOut({ redirect: false });
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to sign out' },
      { status: 500 }
    );
  }
} 