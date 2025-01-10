import logger from '@/lib/logger';



import pool from '@/lib/db';


// Use the new route segment config format
export 
export 

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

    
    
    

    if (!file || !type) {
      return NextResponse.json(
        { message: 'File and type are required' },
        { status: 400 }
      );
    }

    // Upload file to Blob Storage
    
    

    // Start transaction
    await client.query('BEGIN');

    // Check if document of this type already exists
    

    let result;
    if (existingDoc.rows.length > 0) {
      // Update existing document
      result = await client.query(
        `UPDATE document_submissions 
         SET document_url = $1, status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $3 AND document_type = $4
         RETURNING *`,
        [fileUrl, 'pending', user.id, type]
      );
    } else {
      // Insert new document record
      result = await client.query(
        `INSERT INTO document_submissions (user_id, document_type, document_url, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [user.id, type, fileUrl, 'pending']
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Document uploaded successfully',
      document: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error uploading document:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to upload document' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 