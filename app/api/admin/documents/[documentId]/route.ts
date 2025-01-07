import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUser(request.cookies);
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update document status
      const docResult = await client.query(`
        UPDATE document_submissions
        SET 
          status = $1,
          updated_at = CURRENT_TIMESTAMP,
          reviewed_by = $2
        WHERE id = $3
        RETURNING user_id
      `, [status, user.id, params.documentId]);

      if (docResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      const userId = docResult.rows[0].user_id;

      // Check if all required documents are approved
      const docsResult = await client.query(`
        SELECT 
          COUNT(*) as total_docs,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_docs
        FROM document_submissions
        WHERE user_id = $1
      `, [userId]);

      const { total_docs, approved_docs } = docsResult.rows[0];

      // Update user's document verification status
      await client.query(`
        UPDATE profiles
        SET 
          is_documents_verified = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
      `, [total_docs > 0 && total_docs === approved_docs, userId]);

      await client.query('COMMIT');

      return NextResponse.json({
        message: `Document ${status} successfully`
      });
    } catch (error) {
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