import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import { ApiResponse, Document, ApiNextResponse } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
): Promise<ApiNextResponse<ApiResponse<Document[]>>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      ) as ApiNextResponse<ApiResponse<Document[]>>;
    }

    const { userId } = params;

    const result = await query(
      'SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    logger.debug(`Successfully fetched documents for user ${userId}`);
    return NextResponse.json({ 
      success: true, 
      data: result.rows 
    }) as ApiNextResponse<ApiResponse<Document[]>>;

  } catch (error) {
    logger.error('Error fetching user documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    ) as ApiNextResponse<ApiResponse<Document[]>>;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
): Promise<ApiNextResponse<ApiResponse<{document: Document; user_verified: boolean}>>> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      logger.debug('Unauthorized document approval attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' }, 
        { status: 401 }
      ) as ApiNextResponse<ApiResponse<{document: Document; user_verified: boolean}>>;
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const data = await request.json();
    const { documentId, status } = data as { documentId: string; status: string };

    if (!documentId || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid document ID or status' },
        { status: 400 }
      );
    }

    const result = await query(
      'UPDATE documents SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, documentId]
    );

    if (!result.rows[0]) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    const userDocuments = await query(
      'SELECT * FROM documents WHERE user_id = $1',
      [userId]
    );
    const allDocsApproved = userDocuments.rows.every(doc => doc.status === 'approved');

    logger.debug(`Successfully updated document ${documentId} status to ${status}`);
    return NextResponse.json({
      success: true,
      data: {
        document: result.rows[0],
        user_verified: allDocsApproved
      },
      message: `Document ${status} successfully`
    }) as ApiNextResponse<ApiResponse<{document: Document; user_verified: boolean}>>;

  } catch (error) {
    logger.error('Error updating document status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update document status' },
      { status: 500 }
    ) as ApiNextResponse<ApiResponse<{document: Document; user_verified: boolean}>>;
  }
} 