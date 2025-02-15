import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import logger from '@/lib/logger';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';

// Use the new route segment config format
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file || !type) {
      return NextResponse.json(
        { error: 'File and document type are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG and PDF files are allowed.' },
        { status: 400 }
      );
    }

    // Validate document type
    const validTypes = ['license', 'id_proof', 'address_proof'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid document type' },
        { status: 400 }
      );
    }

    // Upload file to blob storage
    const filename = `${session.user.id}/${type}/${randomUUID()}-${file.name}`;
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false
    });

    // Save document record in database
    const result = await db
      .insertInto('documents')
      .values({
        id: randomUUID(),
        user_id: session.user.id,
        type: type as 'license' | 'id_proof' | 'address_proof',
        file_url: blob.url,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning(['id', 'type', 'status', 'file_url'])
      .executeTakeFirst();

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
} 