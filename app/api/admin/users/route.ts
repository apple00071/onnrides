import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import logger from '@/lib/logger';
import { sql } from 'kysely';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    const db = getDb();

    // Get all non-admin users
    const users = await db
      .selectFrom('users')
      .select(['id', 'name', 'email', 'phone', 'role', 'created_at'])
      .where('role', '!=', 'admin')
      .execute();

    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        // Get document counts
        const documentCounts = await db
          .selectFrom('documents')
          .select([
            sql<number>`count(*)`.as('total'),
            sql<number>`sum(case when status = 'approved' then 1 else 0 end)`.as('approved')
          ])
          .where('user_id', '=', user.id)
          .executeTakeFirst();

        // Get booking counts
        const bookingCounts = await db
          .selectFrom('bookings')
          .select([
            sql<number>`count(*)`.as('total'),
            sql<number>`sum(case when status = 'completed' then 1 else 0 end)`.as('completed'),
            sql<number>`sum(case when status = 'cancelled' then 1 else 0 end)`.as('cancelled')
          ])
          .where('user_id', '=', user.id)
          .executeTakeFirst();

        return {
          ...user,
          documents: documentCounts,
          bookings: bookingCounts
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: usersWithDetails
    });

  } catch (error) {
    logger.error('Error fetching users:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch users'
    }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      logger.debug('Unauthorized delete attempt');
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { searchParams } = new URL(_request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    const db = getDb();

    // Check if user exists and is not an admin
    const userCheck = await db
      .selectFrom('users')
      .select('role')
      .where('id', '=', userId)
      .executeTakeFirst();

    if (!userCheck) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    if (userCheck.role === 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete admin users'
      }, { status: 403 });
    }

    // Use a transaction to ensure all deletes succeed or none do
    await db.transaction().execute(async (trx) => {
      // Delete user's documents
      await trx
        .deleteFrom('documents')
        .where('user_id', '=', userId)
        .execute();
      
      // Delete user's bookings
      await trx
        .deleteFrom('bookings')
        .where('user_id', '=', userId)
        .execute();
      
      // Delete the user
      await trx
        .deleteFrom('users')
        .where('id', '=', userId)
        .execute();
    });

    logger.debug(`Successfully deleted user ${userId}`);
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete user'
    }, { status: 500 });
  }
} 