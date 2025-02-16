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
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
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
      `SELECT * FROM documents 
       WHERE id = $1 
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

    // Return the file URL directly
    return NextResponse.json({
      url: document.file_url,
      type: document.type,
      name: document.file_name
    });

  } catch (error) {
    logger.error('Error in admin document file route:', {
      error,
      documentId: params.documentId
    });
    return NextResponse.json(
      { error: 'Failed to process document request' },
      { status: 500 }
    );
  }
} 