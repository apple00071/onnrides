import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Define the User type
export type User = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  created_at: Date | null;
};

/**
 * Get all users using Prisma
 */
export async function getUsers(): Promise<User[]> {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email || '',
      phone: user.phone,
      role: user.role || 'user',
      created_at: user.created_at
    }));
  } catch (error) {
    logger.error('Error fetching users with Prisma:', error);
    return [];
  }
}

/**
 * Get a user by ID using Prisma
 */
export async function getUserById(id: string): Promise<User | null> {
  try {
    const user = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        created_at: true,
      }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email || '',
      phone: user.phone,
      role: user.role || 'user',
      created_at: user.created_at
    };
  } catch (error) {
    logger.error(`Error finding user by ID ${id}:`, error);
    return null;
  }
} 