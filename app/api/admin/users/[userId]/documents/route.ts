import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const currentUser = await getCurrentUser(request.cookies);
    if (!currentUser || currentUser.role !== 'admin') {
      console.log('Unauthorized access attempt to user documents');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          id,
          document_type as type,
          COALESCE(status, 'pending') as status,
          file_url,
          created_at,
          updated_at
        FROM document_submissions
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [userId]);

      // Transform the data to ensure all fields are properly typed
      const documents = result.rows.map(doc => ({
        id: doc.id,
        type: doc.type,
        status: doc.status || 'pending',
        file_url: doc.file_url,
        created_at: doc.created_at,
        updated_at: doc.updated_at
      }));

      console.log(`Successfully fetched ${documents.length} documents for user ${userId}`);
      return NextResponse.json(documents);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching user documents:', error);
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
    const currentUser = await getCurrentUser(request.cookies);
    if (!currentUser || currentUser.role !== 'admin') {
      console.log('Unauthorized document approval attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const data = await request.json();
    const { documentId, status } = data;

    if (!documentId || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid document ID or status' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Start transaction
      await client.query('BEGIN');

      // Update document status
      const updateResult = await client.query(`
        UPDATE document_submissions
        SET 
          status = $1,
          updated_at = NOW()
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `, [status, documentId, userId]);

      if (updateResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Check if all required documents are approved
      const documentsCheck = await client.query(`
        SELECT 
          COUNT(*) as total_docs,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_docs
        FROM document_submissions
        WHERE user_id = $1
      `, [userId]);

      const { total_docs, approved_docs } = documentsCheck.rows[0];
      const allDocsApproved = total_docs > 0 && total_docs === approved_docs;

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

      console.log(`Successfully updated document ${documentId} status to ${status}`);
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
    console.error('Error updating document status:', error);
    return NextResponse.json(
      { error: 'Failed to update document status' },
      { status: 500 }
    );
  }
} 