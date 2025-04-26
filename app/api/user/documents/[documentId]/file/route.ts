import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { documentId } = params;
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Fetch document from database
    const result = await query(
      `SELECT d.*, u.id as user_id 
       FROM documents d
       INNER JOIN users u ON d.user_id = u.id
       WHERE d.id = $1::uuid 
       LIMIT 1`,
      [documentId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const document = result.rows[0];

    // Check if user has access to this document
    if (document.user_id !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Return the file URL directly
    return NextResponse.json({
      url: document.file_url,
      type: document.type,
      name: document.file_name
    });

  } catch (error) {
    logger.error('Error in document file route:', {
      error,
      documentId: params.documentId
    });
    return NextResponse.json(
      { error: 'Failed to process document request' },
      { status: 500 }
    );
  }
} 