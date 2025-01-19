import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from '@/lib/constants';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { User } from '@/lib/types';

export async function verifyAuth() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    
    return { user: session.user as User };
  } catch (error) {
    return null;
  }
} 