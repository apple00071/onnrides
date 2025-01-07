import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const currentUser = await getCurrentUser(request.cookies);
    if (!currentUser) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          u.id,
          u.email,
          u.role,
          u.created_at,
          COALESCE(p.first_name, '') as first_name,
          COALESCE(p.last_name, '') as last_name,
          COALESCE(p.phone_number, '') as phone_number,
          COALESCE(p.address, '') as address,
          COALESCE(p.is_documents_verified, false) as is_documents_verified,
          COALESCE(p.is_blocked, false) as is_blocked,
          COALESCE(
            (SELECT COUNT(*) FROM document_submissions ds 
             WHERE ds.user_id = u.id AND ds.status = 'approved'),
            0
          ) as approved_documents_count,
          COALESCE(
            (SELECT COUNT(*) FROM document_submissions ds 
             WHERE ds.user_id = u.id),
            0
          ) as total_documents_count
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.role = 'user'
        ORDER BY u.created_at DESC
      `);

      // Transform the data to match the expected format
      const users = result.rows.map(user => ({
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`.trim() || 'N/A',
        phone: user.phone_number || 'N/A',
        address: user.address || 'N/A',
        created_at: user.created_at,
        is_blocked: user.is_blocked,
        is_verified: user.is_documents_verified,
        documents_status: {
          approved: parseInt(user.approved_documents_count),
          total: parseInt(user.total_documents_count)
        }
      }));

      return NextResponse.json({ users });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      { message: 'Failed to fetch users. Please try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const currentUser = await getCurrentUser(request.cookies);
    if (!currentUser || currentUser.role !== 'admin') {
      console.log('Unauthorized delete attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Start transaction
      await client.query('BEGIN');

      // Check if trying to delete an admin
      const userCheck = await client.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );

      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      if (userCheck.rows[0].role === 'admin') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Cannot delete admin users' },
          { status: 403 }
        );
      }

      // Delete user's documents
      await client.query('DELETE FROM document_submissions WHERE user_id = $1', [userId]);

      // Delete user's profile
      await client.query('DELETE FROM profiles WHERE user_id = $1', [userId]);

      // Delete user's bookings
      await client.query('DELETE FROM bookings WHERE user_id = $1', [userId]);

      // Finally, delete the user
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      // Commit transaction
      await client.query('COMMIT');

      console.log(`Successfully deleted user ${userId}`);
      return NextResponse.json({ message: 'User deleted successfully' });
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 