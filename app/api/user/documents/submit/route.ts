import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import pool from '@/lib/db';

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

    // Start transaction
    await client.query('BEGIN');

    // Check if all required documents are uploaded
    const result = await client.query(
      `SELECT document_type 
       FROM document_submissions 
       WHERE user_id = $1`,
      [user.id]
    );

    const uploadedDocuments = result.rows.map(row => row.document_type);
    const requiredDocuments = ['dl_front', 'dl_back', 'aadhar_front', 'aadhar_back'];
    const missingDocuments = requiredDocuments.filter(doc => !uploadedDocuments.includes(doc));

    if (missingDocuments.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { 
          message: 'Missing required documents',
          missing: missingDocuments
        },
        { status: 400 }
      );
    }

    // Update user's documents_submitted status
    await client.query(
      `UPDATE users 
       SET documents_submitted = true 
       WHERE id = $1`,
      [user.id]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Documents submitted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting documents:', error);
    return NextResponse.json(
      { message: 'Failed to submit documents' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 