import logger from '@/lib/logger';


export async function POST(request: NextRequest) {
  try {
    // Create response with success message
    

    // Delete the token cookie by setting it to expire immediately
    response.cookies.set('token', '', {
      expires: new Date(0),
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error('Error signing out:', error);
    return NextResponse.json(
      { error: 'Failed to sign out' },
      { status: 500 }
    );
  }
} 