import logger from '@/lib/logger';

import pool from '@/lib/db';


export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    
    if (!currentUser || currentUser.role !== 'admin') {
      logger.debug('Unauthorized access attempt to user documents');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    
    try {
      

      // Transform the data to ensure all fields are properly typed
      

      logger.debug(`Successfully fetched ${documents.length} documents for user ${userId}`);
      return NextResponse.json(documents);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error fetching user documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user documents' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    
    if (!currentUser || currentUser.role !== 'admin') {
      logger.debug('Unauthorized document approval attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    
    const { documentId, status } = data;

    if (!documentId || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid document ID or status' },
        { status: 400 }
      );
    }

    
    try {
      // Start transaction
      await client.query('BEGIN');

      // Update document status
      

      if (updateResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Check if all required documents are approved
      

      const { total_docs, approved_docs } = documentsCheck.rows[0];
      

      // Update profile verification status
      await client.query(`
        UPDATE profiles
        SET 
          is_verified = $1,
          updated_at = NOW()
        WHERE user_id = $2
      `, [allDocsApproved, userId]);

      // Commit transaction
      await client.query('COMMIT');

      logger.debug(`Successfully updated document ${documentId} status to ${status}`);
      return NextResponse.json({
        message: `Document ${status} successfully`,
        document: updateResult.rows[0],
        user_verified: allDocsApproved
      });
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error updating document status:', error);
    return NextResponse.json(
      { error: 'Failed to update document status' },
      { status: 500 }
    );
  }
} 