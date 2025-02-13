import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { ApiResponse, Document, ApiNextResponse } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
): Promise<ApiNextResponse<ApiResponse<Document[]>>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      logger.warn('Unauthorized access attempt:', { userId: params.userId });
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = params;
    if (!userId) {
      logger.warn('Missing userId in request params');
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    logger.info('Fetching documents for user:', { userId });

    const result = await query(
      `SELECT 
        id,
        user_id,
        type,
        status,
        file_url,
        rejection_reason,
        created_at,
        updated_at
       FROM documents 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    // Log the documents being returned
    logger.info('Documents fetched:', {
      userId,
      count: result.rows.length,
      documents: result.rows.map(doc => ({
        id: doc.id,
        type: doc.type,
        status: doc.status,
        hasFileUrl: !!doc.file_url
      }))
    });

    // Ensure all documents have valid URLs
    const documents = result.rows.map(doc => {
      // If URL is relative, make it absolute
      if (doc.file_url && !doc.file_url.startsWith('http')) {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        doc.file_url = `${baseUrl}${doc.file_url}`;
        logger.debug('Converted relative URL to absolute:', { 
          originalUrl: doc.file_url, 
          baseUrl, 
          finalUrl: doc.file_url 
        });
      }
      return doc;
    });

    return NextResponse.json({ 
      success: true, 
      documents 
    });
  } catch (error) {
    logger.error('Error fetching user documents:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: params.userId
    });
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch documents',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
): Promise<ApiNextResponse<ApiResponse<{document: Document; user_verified: boolean}>>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      logger.warn('Unauthorized document approval attempt:', { userId: params.userId });
      return NextResponse.json(
        { success: false, error: 'Unauthorized' }, 
        { status: 401 }
      );
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
    });
  } catch (error) {
    logger.error('Error updating document status:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: params.userId
    });
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update document status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 