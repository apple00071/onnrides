import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';
import { query } from '@/lib/db';

/**
 * Gets the current user from the session and database
 */
export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      if (!session?.user?.email) return null;

      const result = await query(
        'SELECT id, name, email, role::text FROM users WHERE email = $1',
        [session.user.email]
      );
      const user = result.rows[0];
      if (!user) return null;

      return {
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        role: user.role?.toLowerCase() || 'user'
      };
    }

    const result = await query(
      'SELECT id, name, email, role::text FROM users WHERE id = $1',
      [session.user.id]
    );
    const user = result.rows[0];

    if (!user) return null;

    return {
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      role: user.role?.toLowerCase() || 'user'
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}