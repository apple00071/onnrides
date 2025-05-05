import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';
import { prisma } from '@/lib/prisma';

/**
 * Gets the current user from the session and database
 */
export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBlocked: true
      }
    });
    
    if (!user) return null;
    
    return {
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'user',
      isBlocked: user.isBlocked || false
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
} 