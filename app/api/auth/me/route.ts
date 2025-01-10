import logger from '@/lib/logger';



export 

export async function GET(request: NextRequest) {
  try {
    
    
    if (!user) {
      logger.debug('No authenticated user found');
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
    logger.error('Auth check error:', error);
    
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