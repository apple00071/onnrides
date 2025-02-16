import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';

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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      logger.warn('Unauthorized access attempt to documents');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    logger.info('Fetching documents for user:', session.user.id);
    const userDocuments = await query(
      'SELECT * FROM documents WHERE user_id = $1',
      [session.user.id]
    );

    logger.info('Found documents:', userDocuments.rows.length);
    return NextResponse.json(userDocuments.rows);
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      logger.warn('Unauthorized access attempt to upload document');
      return NextResponse.json(
        { error: 'Authentication required' },
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

    if (!ALLOWED_FILE_TYPES.includes(file.type as typeof ALLOWED_FILE_TYPES[number])) {
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

    // Upload to blob storage with user-specific path
    const filename = `${session.user.id}/${type}/${randomUUID()}-${file.name}`;
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false
    });

    // Create new document record
    const documentId = randomUUID();
    const result = await query(
      `INSERT INTO documents (
        id, user_id, type, file_url, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *`,
      [documentId, session.user.id, type, blob.url, 'pending']
    );

    const document = result.rows[0];
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