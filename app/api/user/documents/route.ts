import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.user_id, user.id))
      .orderBy(documents.created_at);

    return NextResponse.json(userDocuments);
  } catch (error) {
    logger.error('Error fetching user documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { type, file_url } = await request.json();

    // Validate required fields
    if (!type || !file_url) {
      return NextResponse.json(
        { error: 'Document type and file URL are required' },
        { status: 400 }
      );
    }

    // Create document
    const [document] = await db
      .insert(documents)
      .values({
        user_id: user.id,
        type,
        file_url,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning();

    return NextResponse.json({
      message: 'Document submitted successfully',
      document
    });
  } catch (error) {
    logger.error('Error submitting document:', error);
    return NextResponse.json(
      { error: 'Failed to submit document' },
      { status: 500 }
    );
  }
} 