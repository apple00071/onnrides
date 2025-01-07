import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    // Get user from token using getCurrentUser
    const user = await getCurrentUser(request.cookies);
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user's documents with proper table name
    const result = await client.query(
      `SELECT 
        ds.id,
        ds.document_type,
        ds.file_url,
        ds.status,
        ds.created_at,
        ds.updated_at
       FROM document_submissions ds
       WHERE ds.user_id = $1 
       ORDER BY ds.created_at DESC`,
      [user.id]
    );

    // Check document verification status
    const verificationResult = await client.query(`
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
        END as is_documents_verified,
        CASE 
          WHEN COUNT(DISTINCT ds.document_type) > 0 THEN true
          ELSE false
        END as documents_submitted
      FROM required_docs rd
      LEFT JOIN document_submissions ds ON ds.document_type = rd.doc_type AND ds.user_id = $1
    `, [user.id]);

    return NextResponse.json({
      documents: result.rows,
      is_verified: verificationResult.rows[0]?.is_documents_verified || false,
      documents_submitted: verificationResult.rows[0]?.documents_submitted || false
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { message: 'Failed to fetch documents' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    // Get user from token using getCurrentUser
    const user = await getCurrentUser(request.cookies);
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
    const result = await client.query(
      `INSERT INTO document_submissions (user_id, document_type, file_url, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user.id, document_type, file_url, 'pending']
    );

    // Update user's documents_submitted status
    await client.query(
      `UPDATE users 
       SET documents_submitted = true 
       WHERE id = $1`,
      [user.id]
    );

    await client.query('COMMIT');

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating document:', error);
    return NextResponse.json(
      { message: 'Failed to create document' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 