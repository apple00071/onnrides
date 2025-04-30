import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { userId } = params;

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        created_at: true,
        _count: {
          select: {
            documents: true,
            bookings: true
          }
        },
        bookings: {
          select: {
            status: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate booking counts
    const bookingCounts = {
      total: user._count.bookings,
      completed: user.bookings.filter(b => b.status === 'completed').length,
      cancelled: user.bookings.filter(b => b.status === 'cancelled').length
    };

    // Remove the raw bookings data from response
    const { bookings, _count, ...userData } = user;

    return NextResponse.json({
      success: true,
      data: {
        ...userData,
        documents: {
          total: user._count.documents
        },
        bookings: bookingCounts
      }
    });

  } catch (error) {
    logger.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
} 