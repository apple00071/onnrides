import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUser(request.cookies);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.documentId;
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

    const client = await pool.connect();
    try {
      // Start transaction
      await client.query('BEGIN');

      // Update document status
      const result = await client.query(`
        UPDATE document_submissions
        SET 
          status = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [status, documentId]);

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Get user ID from the document
      const userId = result.rows[0].user_id;

      // Check if all required documents are approved
      const documentsCheck = await client.query(`
        WITH required_docs AS (
          SELECT 'dl_front' as doc_type
          UNION SELECT 'dl_back'
          UNION SELECT 'aadhar_front'
          UNION SELECT 'aadhar_back'
        )
        SELECT 
          CASE 
            WHEN COUNT(DISTINCT rd.doc_type) = (
              SELECT COUNT(*) FROM required_docs
            ) AND COUNT(*) = COUNT(CASE WHEN ds.status = 'approved' THEN 1 END)
            THEN true
            ELSE false
          END as all_approved
        FROM required_docs rd
        LEFT JOIN document_submissions ds ON ds.document_type = rd.doc_type AND ds.user_id = $1
      `, [userId]);

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
    console.error('Error updating document status:', error);
    return NextResponse.json(
      { error: 'Failed to update document status' },
      { status: 500 }
    );
  }
} 