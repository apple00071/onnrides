import { NextResponse, NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Simply allow all requests through
  return new NextResponse();
}

export const config = {
  matcher: [],  // Don't match any paths
}; 