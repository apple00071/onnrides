import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import logger from '@/lib/logger';
import { findDocuments, updateDocument } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { documents } from '@/lib/schema';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      logger.debug('Unauthorized access attempt to user documents');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const userDocuments = await findDocuments();
    const filteredDocuments = userDocuments.filter(doc => doc.user_id === userId);
    logger.debug(`Successfully fetched documents for user ${userId}`);
    return NextResponse.json(filteredDocuments);
    
  } catch (error) {
    logger.error('Error fetching user documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user documents' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      logger.debug('Unauthorized document approval attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const data = await request.json();
    const { documentId, status } = data;

    if (!documentId || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid document ID or status' },
        { status: 400 }
      );
    }

    try {
      // Update document status
      const updatedDocument = await updateDocument(documentId, {
        status: status as 'approved' | 'rejected',
        updated_at: new Date()
      });

      if (!updatedDocument) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Check if all required documents are approved
      const userDocuments = await findDocuments();
      const filteredDocuments = userDocuments.filter(doc => doc.user_id === userId);
      const allDocsApproved = filteredDocuments.every(doc => doc.status === 'approved');

      logger.debug(`Successfully updated document ${documentId} status to ${status}`);
      return NextResponse.json({
        message: `Document ${status} successfully`,
        document: updatedDocument,
        user_verified: allDocsApproved
      });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    logger.error('Error updating document status:', error);
    return NextResponse.json(
      { error: 'Failed to update document status' },
      { status: 500 }
    );
  }
} 