import { cookies } from 'next/headers';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { documents, DOCUMENT_TYPES, type DocumentType } from '@/lib/schema';
import logger from '@/lib/logger';
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const auth = await verifyAuth(cookieStore);
    if (!auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!type || !DOCUMENT_TYPES.includes(type as DocumentType)) {
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
          url: blob.url,
          updated_at: new Date(),
          status: 'pending'
        })
        .where(eq(documents.id, existingDoc.id));

      return NextResponse.json({ 
        message: 'Document updated successfully',
        url: blob.url
      });
    }

    // Create new document record
    await db.insert(documents).values({
      id: crypto.randomUUID(),
      user_id: auth.user.id,
      type: type as DocumentType,
      url: blob.url,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    });

    return NextResponse.json({ 
      message: 'Document uploaded successfully',
      url: blob.url
    });

  } catch (error) {
    logger.error('Error uploading document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 