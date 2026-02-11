import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { QueryResultRow } from 'pg';

interface DocumentRow extends QueryResultRow {
  id: string;
  user_id: string;
  status: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    // S-Verify: Verify admin access using standardized session check
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
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
    const validStatuses = ['pending', 'approved', 'rejected', 'draft', 'published', 'archived'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Fixed: query returns QueryResult, destructure from .rows
    const result = await query<DocumentRow>(
      `UPDATE documents 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [status, documentId]
    );

    const updatedDocument = result.rows[0];

    if (!updatedDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get all documents for this user
    const userDocuments = await query<DocumentRow>(
      `SELECT * FROM documents WHERE user_id = $1`,
      [updatedDocument.user_id]
    );

    // Fixed: access .rows for length and filter
    const totalDocuments = userDocuments.rows.length;
    const approvedDocuments = userDocuments.rows.filter(doc => doc.status === 'approved').length;

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