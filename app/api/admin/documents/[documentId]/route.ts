import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getCurrentUser } from '@/lib/auth';
import type { User } from '@/lib/types';

interface AuthResult {
  user: User;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
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
    // Check status against valid values directly in query
    const validStatuses = ['draft', 'published', 'archived'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Update document status using raw SQL
    const [updatedDocument] = await query(
      `UPDATE documents 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [status, documentId]
    );

    if (!updatedDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get all documents for this user
    const userDocuments = await query(
      `SELECT * FROM documents WHERE user_id = $1`,
      [updatedDocument.user_id]
    );

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