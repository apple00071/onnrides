import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import type { User } from '@/lib/types';

interface AuthResult {
  user: User;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string; documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId, documentId } = params;

    // First get the document details to delete from storage if needed
    const documentResult = await query(
      'SELECT * FROM user_documents WHERE id = $1::uuid AND user_id = $2',
      [documentId, userId]
    );

    if (documentResult.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete the document from the database
    await query(
      'DELETE FROM user_documents WHERE id = $1::uuid AND user_id = $2',
      [documentId, userId]
    );

    // Here you would also delete the file from your storage (Azure, AWS, etc.)
    // Implementation depends on your storage solution

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting document:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string; documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId, documentId } = params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status' },
        { status: 400 }
      );
    }

    // Update document status
    const result = await query(
      `UPDATE user_documents 
       SET status = $1::uuid, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND user_id = $3 
       RETURNING *`,
      [status, documentId, userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Document not found' },
        { status: 404 }
      );
    }

    // Log the status change
    logger.info('Document status updated:', {
      documentId,
      userId,
      newStatus: status,
      updatedBy: session.user.id
    });

    return NextResponse.json({
      success: true,
      message: `Document ${status} successfully`,
      document: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating document status:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update document status' },
      { status: 500 }
    );
  }
}

// Add GET route to handle document retrieval
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string; documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId, documentId } = params;

    // Get document details
    const documentResult = await query(
      'SELECT * FROM user_documents WHERE id = $1::uuid AND user_id = $2',
      [documentId, userId]
    );

    if (documentResult.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Document not found' },
        { status: 404 }
      );
    }

    const document = documentResult.rows[0];

    // Return the document URL with proper headers
    return NextResponse.json({
      success: true,
      document: {
        ...document,
        url: document.url,
        content_type: document.content_type || 'application/octet-stream'
      }
    });
  } catch (error) {
    logger.error('Error retrieving document:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve document' },
      { status: 500 }
    );
  }
} 