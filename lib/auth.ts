import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import type { User } from './types';
import { findUserById } from './db';
import { NextResponse } from 'next/server';
import { getServerSession, type AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import logger from './logger';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: 'user' | 'admin';
    }
  }
  interface User {
    id: string;
    email: string;
    name: string | null;
    role: 'user' | 'admin';
  }
}

function getJwtKey() {
  const secretKey = process.env.JWT_SECRET_KEY;
  if (!secretKey) {
    throw new Error('JWT_SECRET_KEY is not set');
  }
  return new TextEncoder().encode(secretKey);
}

export const authOptions: AuthOptions = {
  debug: process.env.NODE_ENV === 'development',
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          logger.info('Authorizing credentials:', { email: credentials?.email });

          if (!credentials?.email || !credentials?.password) {
            logger.warn('Missing credentials');
            return null;
          }

          const user = await validateUser(credentials.email, credentials.password);
          
          if (!user) {
            logger.warn('Invalid credentials for user:', { email: credentials.email });
            return null;
          }

          logger.info('User authorized successfully:', { userId: user.id, email: user.email });
          
          const authUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          };
          
          return authUser;
        } catch (error) {
          logger.error('Authorization error:', { error: (error as Error).message });
          return null;
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        logger.debug('Creating new JWT token for user:', { 
          userId: user.id,
          userEmail: user.email,
          userRole: user.role 
        });
        return {
          ...token,
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
      return token;
    },
    async session({ session, token }) {
      if (!session.user?.id) {
        logger.debug('Creating new session from token:', { 
          tokenId: token.id,
          tokenEmail: token.email,
          tokenRole: token.role 
        });
      }
      return {
        ...session,
        user: {
          id: token.id as string,
          email: token.email as string,
          name: token.name as string | null,
          role: token.role as 'user' | 'admin',
        }
      };
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  logger: {
    error(code, metadata) {
      logger.error('NextAuth error:', { code, metadata });
    },
    warn(code) {
      logger.warn('NextAuth warning:', { code });
    },
    debug(code, metadata) {
      logger.debug('NextAuth debug:', { code, metadata });
    },
  },
};

export async function verifyAuth() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    return session.user as User;
  } catch {
    return null;
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
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0] || null;
}

export async function validateUser(email: string, password: string): Promise<User | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const isValid = await comparePasswords(password, user.password_hash);
  return isValid ? user : null;
} 