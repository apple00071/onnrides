import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import pool from '@/lib/db';

// Use the new route segment config format
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    // Get user from token
    const token = cookies().get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file || !type) {
      return NextResponse.json(
        { message: 'File and type are required' },
        { status: 400 }
      );
    }

    // Convert file to base64 for storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64String = buffer.toString('base64');
    const fileUrl = `data:${file.type};base64,${base64String}`;

    // Start transaction
    await client.query('BEGIN');

    // Insert document record with base64 data
    const result = await client.query(
      `INSERT INTO document_submissions (user_id, document_type, document_url, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user.id, type, fileUrl, 'pending']
    );

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Document uploaded successfully',
      document: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to upload document' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 