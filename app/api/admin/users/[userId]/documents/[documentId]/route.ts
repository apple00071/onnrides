import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { documents } from '@/lib/schema';
import { verifyAuth } from '@/lib/auth';
import type { User } from '@/lib/types';
import { eq, sql } from 'drizzle-orm';

interface AuthResult {
  user: User;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string; documentId: string } }
) {
  try {
    const user = await verifyAuth();
    if (!user || user.role !== 'admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { status } = await request.json();

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return new NextResponse('Invalid status', { status: 400 });
    }

    const document = await db
      .update(documents)
      .set({
        status,
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(documents.id, params.documentId))
      .returning();

    if (!document.length) {
      return new NextResponse('Document not found', { status: 404 });
    }

    return NextResponse.json(document[0]);
  } catch (error) {
    logger.error('Error updating document:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 