import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';
import logger from '@/lib/logger';

/**
 * Verifies if a user is authenticated and optionally checks their role
 */
export const verifyAuth = async (session: any | null, allowedRoles?: string[]): Promise<boolean> => {
  try {
    if (!session?.user) return false;

    // If no roles specified, just check if user is authenticated
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    // Check if user's role is in allowed roles
    return allowedRoles.includes(session.user.role?.toUpperCase());
  } catch {
    return false;
  }
};

/**
 * Verifies if a user has admin or staff privileges with optional permission check
 */
export const verifyAdminOrStaff = async (permission?: string): Promise<boolean> => {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return false;
  }

  const role = session.user.role?.toLowerCase();

  // Admins always have access
  if (role === 'admin') {
    return true;
  }

  // Staff check
  if (role === 'staff') {
    // If no specific permission required, staff is allowed
    if (!permission) {
      return true;
    }

    // Check specific permission
    return !!(session.user.permissions as any)?.[permission];
  }

  return false;
};

/**
 * Verifies if a user has admin privileges
 */
export const verifyAdmin = async (request: Request): Promise<boolean> => {
  const session = await getServerSession(authOptions);

  if (!session) {
    return false;
  }

  return session.user?.role === 'admin';
};