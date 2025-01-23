import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/schema';
import { verifyAuth } from '@/lib/auth';
import type { User } from '@/lib/types';
import logger from '@/lib/logger';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth() as { user: User } | null;
    if (!auth) {
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

    // TODO: Upload file to cloud storage and get URL
    const fileUrl = 'https://example.com/placeholder'; // Replace with actual file upload
    const now = new Date().toISOString();

    const [document] = await db.insert(documents)
      .values({
        id: randomUUID(),
        user_id: auth.user.id,
        type: type as 'license' | 'id_proof' | 'address_proof',
        status: 'pending',
        file_url: fileUrl,
        created_at: now,
        updated_at: now,
      })
      .returning();

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