import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { documents, DOCUMENT_TYPES } from '@/lib/schema';
import logger from '@/lib/logger';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import type { Session } from 'next-auth';

type AuthResult = { user: Session['user'] } | null;

const VALID_DOCUMENT_TYPES = ['license', 'id_proof', 'address_proof'] as const;

export async function GET() {
  try {
    const auth = await verifyAuth() as AuthResult;
    if (!auth?.user) {
      logger.warn('Unauthorized access attempt to documents');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    logger.info('Fetching documents for user:', auth.user.id);
    const userDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.user_id, auth.user.id));

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

export async function POST(request: Request) {
  try {
    const auth = await verifyAuth() as AuthResult;
    if (!auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, url } = await request.json();

    // Validate required fields
    if (!type || !url) {
      return NextResponse.json(
        { error: 'Document type and URL are required' },
        { status: 400 }
      );
    }

    // Validate document type
    if (!type || !VALID_DOCUMENT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid document type' },
        { status: 400 }
      );
    }

    // Create document
    const [document] = await db
      .insert(documents)
      .values({
        user_id: auth.user.id,
        type,
        file_url: url,
        status: 'pending'
      })
      .returning();

    return NextResponse.json({
      message: 'Document submitted successfully',
      document
    });
  } catch (error) {
    logger.error('Error submitting document:', error);
    return NextResponse.json(
      { error: 'Failed to submit document' },
      { status: 500 }
    );
  }
} 