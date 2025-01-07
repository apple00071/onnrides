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

    // Start transaction
    await client.query('BEGIN');

    // For now, we'll store the file URL as a placeholder
    // In a real application, you would upload the file to a storage service
    const document_url = `https://storage.example.com/${user.id}/${type}/${file.name}`;

    // Insert document record
    const result = await client.query(
      `INSERT INTO document_submissions (user_id, document_type, document_url, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user.id, type, document_url, 'pending']
    );

    // Update user's documents_submitted status
    await client.query(
      `UPDATE users 
       SET documents_submitted = true 
       WHERE id = $1`,
      [user.id]
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
      { message: 'Failed to upload document' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 