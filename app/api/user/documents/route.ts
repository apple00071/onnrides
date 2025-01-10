import logger from '@/lib/logger';

import pool from '@/lib/db';


export 

export async function GET(request: NextRequest) {
  
  
  try {
    // Get user from token using getCurrentUser
    
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user&apos;s documents with proper table name
    

    // Transform the data to ensure all fields are properly typed
    

    // Check document verification status
    

    return NextResponse.json({
      documents,
      is_verified: verificationResult.rows[0]?.is_documents_verified || false,
      documents_submitted: verificationResult.rows[0]?.documents_submitted || false
    });
  } catch (error) {
    logger.error('Error fetching documents:', error);
    return NextResponse.json(
      { message: 'Failed to fetch documents' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  
  try {
    // Get user from token using getCurrentUser
    
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { document_type, file_url } = await request.json();

    if (!document_type || !file_url) {
      return NextResponse.json(
        { message: 'Document type and URL are required' },
        { status: 400 }
      );
    }

    // Start transaction
    await client.query('BEGIN');

    // Insert document
    

    await client.query('COMMIT');

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating document:', error);
    return NextResponse.json(
      { message: 'Failed to create document' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 