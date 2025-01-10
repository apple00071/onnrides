import logger from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface Document {
  id: string;
  document_type: string;
  file_url: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  let client;
  try {
    // Get user from session
    const session = await getServerSession(authOptions);
    const user = session?.user;

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get database connection
    client = await pool.connect();

    // Fetch user's documents
    const documentsResult = await client.query(`
      SELECT 
        id,
        document_type,
        file_url,
        status,
        created_at,
        updated_at
      FROM document_submissions
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
      ORDER BY created_at DESC
    `, [user.email]);

    const documents: Document[] = documentsResult.rows;

    // Check document verification status
    const verificationResult = await client.query(`
      SELECT 
        COUNT(DISTINCT document_type) = 4 AND COUNT(*) = COUNT(CASE WHEN status = 'approved' THEN 1 END) as is_documents_verified,
        COUNT(*) > 0 as documents_submitted
      FROM document_submissions
      WHERE user_id = (SELECT id FROM users WHERE email = $1)
    `, [user.email]);

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
    if (client) client.release();
  }
}

export async function POST(request: NextRequest) {
  let client;
  try {
    // Get user from session
    const session = await getServerSession(authOptions);
    const user = session?.user;

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

    // Get database connection
    client = await pool.connect();

    // Start transaction
    await client.query('BEGIN');

    // Insert document
    const result = await client.query(`
      INSERT INTO document_submissions (
        user_id,
        document_type,
        file_url,
        status
      ) VALUES (
        (SELECT id FROM users WHERE email = $1),
        $2,
        $3,
        'pending'
      )
      RETURNING *
    `, [user.email, document_type, file_url]);

    await client.query('COMMIT');

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    logger.error('Error creating document:', error);
    return NextResponse.json(
      { message: 'Failed to create document' },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
} 