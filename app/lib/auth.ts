import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from '@/lib/constants';

export type User = {
  id: string;
  email: string;
  name?: string;
  role: string;
};

export async function verifyAuth(cookieStore: ReturnType<typeof cookies>) {
  try {
    const token = cookieStore.get('token')?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
    return payload as { user: User };
  } catch (error) {
    return null;
  }
} 