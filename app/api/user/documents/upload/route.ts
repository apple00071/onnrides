import logger from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/lib/auth';
import { put } from '@vercel/blob';
import { COLLECTIONS, findMany, create, update, BaseItem } from '@/app/lib/lib/db';

interface Document extends BaseItem {
  user_id: string;
  type: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
}

export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const session = await getServerSession(authOptions);
    const user = session?.user;

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file || !type) {
      return NextResponse.json(
        { message: 'File and type are required' },
        { status: 400 }
      );
    }

    // Upload file to Vercel Blob Storage
    const blob = await put(file.name, file, {
      access: 'public',
      addRandomSuffix: true,
      contentType: file.type
    });

    // Check if document of this type already exists
    const existingDocs = await findMany<Document>(COLLECTIONS.DOCUMENTS, {
      user_id: user.id,
      type: type
    });

    if (existingDocs.length > 0) {
      // Update existing document
      await update<Document>(COLLECTIONS.DOCUMENTS, existingDocs[0].id, {
        url: blob.url,
        status: 'pending',
      });
    } else {
      // Create new document submission
      await create<Document>(COLLECTIONS.DOCUMENTS, {
        user_id: user.id,
        type,
        url: blob.url,
        status: 'pending'
      });
    }

    return NextResponse.json({
      message: 'Document uploaded successfully',
      url: blob.url
    });

  } catch (error) {
    logger.error('Error in document upload:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 