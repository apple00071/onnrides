import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { documents } from '@/lib/schema';
import logger from '@/lib/logger';
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import type { Session } from 'next-auth';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

const VALID_DOCUMENT_TYPES = ['license', 'id_proof', 'address_proof'] as const;
type DocumentType = typeof VALID_DOCUMENT_TYPES[number];

const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function GET() {
  try {
    const auth = await verifyAuth();
    if (!auth) {
      logger.warn('Unauthorized access attempt to documents');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    logger.info('Fetching documents for user:', auth.id);
    const userDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.user_id, auth.id));

    logger.info('Found documents:', userDocuments.length);
    return NextResponse.json(userDocuments);
  } catch (error) {
    logger.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth) {
      logger.warn('Unauthorized access attempt to upload document');
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    if (!type || !VALID_DOCUMENT_TYPES.includes(type as DocumentType)) {
      return NextResponse.json(
        { error: "Invalid document type" },
        { status: 400 }
      );
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    const blob = await put(crypto.randomUUID(), file, {
      access: "public",
    });

    // Create new document record
    const [document] = await db
      .insert(documents)
      .values({
        id: crypto.randomUUID(),
        user_id: auth.id,
        type: type as DocumentType,
        file_url: blob.url,
        status: 'pending',
        created_at: sql`strftime('%s', 'now')`,
        updated_at: sql`strftime('%s', 'now')`
      })
      .returning();

    logger.info('Document uploaded successfully:', document.id);
    return NextResponse.json(document);
  } catch (error) {
    logger.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
} 