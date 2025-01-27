import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { put } from '@vercel/blob';
import type { Session } from 'next-auth';
import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';

const VALID_DOCUMENT_TYPES = ['license', 'id_proof', 'address_proof'] as const;
type DocumentType = typeof VALID_DOCUMENT_TYPES[number];

const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface DocumentRow {
  id: string;
  user_id: string;
  type: DocumentType;
  file_url: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export async function GET() {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      logger.warn('Unauthorized access attempt to documents');
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    logger.info('Fetching documents for user:', auth.id);
    const userDocuments = await query(
      'SELECT * FROM documents WHERE user_id = $1',
      [auth.id]
    );

    logger.info('Found documents:', userDocuments.length);
    return new Response(JSON.stringify(userDocuments), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error fetching documents:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentUser();
    if (!auth) {
      logger.warn('Unauthorized access attempt to upload document');
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!type || !VALID_DOCUMENT_TYPES.includes(type as DocumentType)) {
      return new Response(JSON.stringify({ error: "Invalid document type" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type as typeof ALLOWED_FILE_TYPES[number])) {
      return new Response(JSON.stringify({ error: "Invalid file type" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: "File size exceeds 5MB limit" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const blob = await put(randomUUID(), file, {
      access: "public",
    });

    // Create new document record
    const [document] = await db
      .insert(documents)
      .values({
        id: randomUUID(),
        user_id: auth.id,
        type: type as DocumentType,
        file_url: blob.url,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning();

    logger.info('Document uploaded successfully:', document.id);
    return new Response(JSON.stringify(document), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error("Error uploading document:", error);
    return new Response(JSON.stringify({ error: "Failed to upload document" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 