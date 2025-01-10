import logger from '@/lib/logger';

import pool from '@/lib/db';


export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string; documentId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await request.json();
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    
    try {
      await client.query('BEGIN');

      // Update document status
      

      if (documentResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Check if all required documents are approved
      

      

      // Update user&apos;s verification status in profiles table
      await client.query(
        `UPDATE profiles 
         SET is_documents_verified = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [allDocsApproved, params.userId]
      );

      await client.query('COMMIT');

      // Get updated user data
      

      
      

      return NextResponse.json({
        message: `Document ${status} successfully`,
        document: documentResult.rows[0],
        user: transformedUser,
        user_verified: allDocsApproved
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