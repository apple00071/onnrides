import logger from '@/lib/logger';



import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  
  try {
    // Get user from token
    
    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    
    if (!user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Start transaction
    await client.query('BEGIN');

    // Check if all required documents are uploaded
    

    
    
    

    if (missingDocuments.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { 
          message: 'Missing required documents',
          missing: missingDocuments
        },
        { status: 400 }
      );
    }

    // Update user&apos;s documents_submitted status
    await client.query(
      `UPDATE users 
       SET documents_submitted = true 
       WHERE id = $1`,
      [user.id]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Documents submitted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error submitting documents:', error);
    return NextResponse.json(
      { message: 'Failed to submit documents' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 