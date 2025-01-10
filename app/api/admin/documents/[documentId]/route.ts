import logger from '@/lib/logger';

import pool from '@/lib/db';


export async function PUT(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const { status } = await request.json();
    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    
    try {
      // Start transaction
      await client.query('BEGIN');

      // Update document status
      

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Get user ID from the document
      

      // Check if all required documents are approved
      

      // Update profile verification status
      await client.query(`
        UPDATE profiles
        SET 
          is_documents_verified = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
      `, [documentsCheck.rows[0].all_approved, userId]);

      await client.query('COMMIT');

      return NextResponse.json({
        message: 'Document status updated successfully',
        document: result.rows[0],
        is_verified: documentsCheck.rows[0].all_approved
      });
    } catch (error) {
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