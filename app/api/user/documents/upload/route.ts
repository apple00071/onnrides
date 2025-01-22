import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { documents, DOCUMENT_TYPES } from '@/lib/schema';
import logger from '@/lib/logger';
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import type { Session } from 'next-auth';
import crypto from 'crypto';

type AuthResult = { user: Session['user'] } | null;

const VALID_DOCUMENT_TYPES = ['license', 'id_proof', 'address_proof'] as const;
type DocumentType = typeof VALID_DOCUMENT_TYPES[number];

export async function POST(request: Request) {
  try {
    const auth = await verifyAuth() as AuthResult;
    if (!auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as DocumentType;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!type || !VALID_DOCUMENT_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });
    }

    // Check if user already has a document of this type
    const existingDocs = await db.select().from(documents).where(eq(documents.user_id, auth.user.id));
    const existingDoc = existingDocs.find(doc => doc.type === type);

    // Upload file to blob storage
    const blob = await put(`documents/${auth.user.id}/${type}/${file.name}`, file, {
      access: 'private',
    });

    if (existingDoc) {
      // Update existing document
      await db.update(documents)
        .set({ 
          file_url: blob.url,
          updated_at: sql`strftime('%s', 'now')`,
          status: 'pending'
        })
        .where(eq(documents.id, existingDoc.id));

      return NextResponse.json({ 
        message: 'Document updated successfully',
        url: blob.url
      });
    }

    // Create new document record
    const [document] = await db
      .insert(documents)
      .values({
        id: crypto.randomUUID(),
        user_id: auth.user.id,
        type,
        file_url: blob.url,
        status: 'pending',
        created_at: sql`strftime('%s', 'now')`,
        updated_at: sql`strftime('%s', 'now')`
      })
      .returning();

    return NextResponse.json({ 
      message: 'Document uploaded successfully',
      document
    });

  } catch (error) {
    logger.error('Error uploading document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 