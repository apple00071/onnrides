import logger from '@/lib/logger';



export 

export async function POST(request: NextRequest) {
  try {
    // Clear the auth token cookie
    cookies().delete('token');

    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
} 