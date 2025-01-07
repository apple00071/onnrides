import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string; documentId: string } }
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
      const documentResult = await client.query(
        `UPDATE document_submissions 
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND user_id = $3
         RETURNING *`,
        [status, params.documentId, params.userId]
      );

      if (documentResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Check if all required documents are approved
      const documentsResult = await client.query(`
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
          END as all_docs_approved
        FROM required_docs rd
        LEFT JOIN document_submissions ds ON ds.document_type = rd.doc_type 
        AND ds.user_id = $1 AND ds.status = 'approved'
      `, [params.userId]);

      const allDocsApproved = documentsResult.rows[0]?.all_docs_approved || false;

      // Update user's verification status in profiles table
      await client.query(
        `UPDATE profiles 
         SET is_documents_verified = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [allDocsApproved, params.userId]
      );

      await client.query('COMMIT');

      // Get updated user data
      const userResult = await client.query(`
        SELECT 
          u.id,
          u.email,
          u.role,
          p.first_name,
          p.last_name,
          p.phone,
          p.address,
          p.is_documents_verified,
          p.is_blocked
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.id = $1
      `, [params.userId]);

      const updatedUser = userResult.rows[0];
      const transformedUser = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.first_name || '',
        phone: updatedUser.phone || '',
        address: updatedUser.address || '',
        is_blocked: updatedUser.is_blocked || false,
        is_verified: updatedUser.is_documents_verified || false
      };

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
    console.error('Error updating document status:', error);
    return NextResponse.json(
      { error: 'Failed to update document status' },
      { status: 500 }
    );
  }
} 