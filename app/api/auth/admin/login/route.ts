import logger from '@/lib/logger';



import pool from '@/lib/db';

export 

export async function POST(request: NextRequest) {
  let client;
  
  try {
    
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get database connection
    try {
      client = await pool.connect();
    } catch (dbError) {
      logger.error('Database connection error:', dbError);
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    try {
      // Get user from database
      

      
      if (!user) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      // Check if user is an admin
      if (user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Unauthorized access' },
          { status: 403 }
        );
      }

      // Verify password
      
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        );
      }

      // Get admin profile
      

      

      // Generate token
      

      // Create response
      

      // Set cookie
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      });

      return response;
    } catch (error) {
      logger.error('Database query error:', error);
      throw error; // Re-throw to be caught by outer catch
    }
  } catch (error: any) {
    logger.error('Admin login error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during login',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseError) {
        logger.error('Error releasing client:', releaseError);
      }
    }
  }
} 