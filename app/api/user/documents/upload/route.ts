import logger from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';
import { put } from '@vercel/blob';

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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file || !type) {
      return NextResponse.json(
        { message: 'File and type are required' },
        { status: 400 }
      );
    }

    // Upload file to Blob Storage
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true
    });
    const fileUrl = blob.url;

    // Get database connection
    client = await pool.connect();

    // Start transaction
    await client.query('BEGIN');

    // Check if document of this type already exists
    const existingDoc = await client.query(
      `SELECT * FROM document_submissions 
       WHERE user_id = (SELECT id FROM users WHERE email = $1)
       AND document_type = $2`,
      [user.email, type]
    );

    let result;
    if (existingDoc.rows.length > 0) {
      // Update existing document
      result = await client.query(
        `UPDATE document_submissions 
         SET file_url = $1, status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = (SELECT id FROM users WHERE email = $3)
         AND document_type = $4
         RETURNING *`,
        [fileUrl, 'pending', user.email, type]
      );
    } else {
      // Insert new document record
      result = await client.query(
        `INSERT INTO document_submissions (
          user_id,
          document_type,
          file_url,
          status
        ) VALUES (
          (SELECT id FROM users WHERE email = $1),
          $2,
          $3,
          $4
        ) RETURNING *`,
        [user.email, type, fileUrl, 'pending']
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Document uploaded successfully',
      document: result.rows[0]
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    logger.error('Error uploading document:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to upload document' },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
} 