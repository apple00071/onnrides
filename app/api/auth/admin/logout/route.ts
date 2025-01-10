import logger from '@/lib/logger';



export async function POST() {
  try {
    // Clear the admin token cookie
    cookies().delete('admin_token');

    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
} 