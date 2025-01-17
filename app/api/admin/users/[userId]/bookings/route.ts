import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { bookings } from '@/lib/schema';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      logger.debug('Unauthorized access attempt to user bookings');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const userBookings = await db
      .select()
      .from(bookings)
      .where(eq(bookings.user_id, userId));

    logger.debug(`Successfully fetched ${userBookings.length} bookings for user ${userId}`);
    return NextResponse.json(userBookings);
    
  } catch (error) {
    logger.error('Error fetching user bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user bookings' },
      { status: 500 }
    );
  }
} 