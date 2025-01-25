import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import logger from '@/lib/logger';
import { documents, statusEnum } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth';
import type { User } from '@/lib/types';
import { eq, sql } from 'drizzle-orm';

interface AuthResult {
  user: User;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const auth = await verifyAuth() as AuthResult | null;
    if (!auth || auth.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = params;
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const { status } = await request.json();
    if (!status || !statusEnum.enumValues.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Update document status
    const [updatedDocument] = await db
      .update(documents)
      .set({
        status: status as typeof statusEnum.enumValues[number],
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(documents.id, documentId))
      .returning();

    if (!updatedDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get all documents for this user
    const userDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.user_id, updatedDocument.user_id));

    // Check if all required documents are approved
    const totalDocuments = userDocuments.length;
    const approvedDocuments = userDocuments.filter(doc => doc.status === 'approved').length;

    return NextResponse.json({
      message: 'Document status updated successfully',
      document: updatedDocument,
      documents_status: {
        approved: approvedDocuments,
        total: totalDocuments
      }
    });

  } catch (error) {
    logger.error('Error updating document status:', error);
    return NextResponse.json(
      { error: 'Failed to update document status' },
      { status: 500 }
    );
  }
} 