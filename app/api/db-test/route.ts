import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(): Promise<NextResponse> {
  console.log('Test endpoint called');
  
  return NextResponse.json({
    ok: true,
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
} 