import logger from '@/lib/logger';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { query } from '@/lib/db';
import type { User } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { getServerSession, type AuthOptions, NextAuthOptions } from 'next-auth';
import type { DefaultJWT, JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { compare } from "bcrypt";

export type UserRole = 'user' | 'admin';

type UserInfo = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

declare module 'next-auth' {
  interface Session {
    user: UserInfo;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  }
}

function getJwtKey() {
  const secretKey = process.env.JWT_SECRET_KEY;
  if (!secretKey) {
    throw new Error('JWT_SECRET_KEY is not set');
  }
  return new TextEncoder().encode(secretKey);
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // Add your authentication logic here
        // For example, check against environment variables
        if (
          credentials?.username === process.env.ADMIN_USERNAME &&
          credentials?.password === process.env.ADMIN_PASSWORD
        ) {
          return {
            id: '1',
            name: 'Admin',
            email: 'admin@example.com',
            role: 'admin'
          };
        }
        return null;
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/auth/signin'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    }
  }
};

export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return null
    }
    return session.user
  } catch (error) {
    logger.error('Auth verification error:', error)
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await query(
    'SELECT * FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  return result.rows[0] || null;
}

export async function validateUser(email: string, password: string): Promise<User | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const isValid = await comparePasswords(password, user.password_hash);
  return isValid ? user : null;
} 