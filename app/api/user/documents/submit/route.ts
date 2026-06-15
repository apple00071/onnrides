import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth/user';
import type { User } from '@/lib/types';
import logger from '@/lib/logger';
import { randomUUID } from 'crypto';
import { uploadFile } from '@/lib/upload';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser() as User | null;
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded' }, { status: 400 });
    }

    const validTypes = ['license', 'id_proof', 'address_proof'] as const;
    if (!type || !validTypes.includes(type as any)) {
      return NextResponse.json({ message: 'Invalid document type' }, { status: 400 });
    }

    // Upload file to cloud storage and get URL
    const folderPath = `documents/${user.id}/${type}`;
    const fileUrl = await uploadFile(file, folderPath);
    const now = new Date().toISOString();

    const result = await query(
      `INSERT INTO documents (
        id, user_id, type, status, file_url, created_at, updated_at
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        randomUUID(),
        user.id,
        type,
        'pending',
        fileUrl,
        now,
        now
      ]
    );

    const document = result.rows[0];

    return NextResponse.json({
      message: 'Document uploaded successfully',
      document: {
        id: document.id,
        type: document.type,
        status: document.status
      }
    });
  } catch (error) {
    logger.error('Error uploading document:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 
