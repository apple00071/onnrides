import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import type { User } from './types';
import { findUserById } from './db';
import { NextResponse } from 'next/server';
import { getServerSession, type AuthOptions } from 'next-auth';
import type { DefaultJWT, JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import logger from './logger';

export type UserRole = 'user' | 'admin';

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}

declare module 'next-auth' {
  interface Session {
    user: AuthUser;
  }
  interface User extends AuthUser {}
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT, AuthUser {}
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
      async authorize(credentials, req) {
        try {
          logger.info('Authorizing credentials:', { email: credentials?.email });

          if (!credentials?.email || !credentials?.password) {
            logger.warn('Missing credentials');
            return null;
          }

          // Find user by email
          const user = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email))
            .limit(1);

          if (!user.length) {
            logger.warn('User not found:', { email: credentials.email });
            return null;
          }

          // Verify password
          const isValid = await bcrypt.compare(credentials.password, user[0].password_hash);
          if (!isValid) {
            logger.warn('Invalid password for user:', { email: credentials.email });
            return null;
          }

          logger.info('User authorized successfully:', { userId: user[0].id, email: user[0].email });
          
          if (user[0].role !== 'user' && user[0].role !== 'admin') {
            logger.error('Invalid user role:', { userId: user[0].id, role: user[0].role });
            return null;
          }

          return {
            id: user[0].id,
            email: user[0].email,
            name: user[0].name || '',
            role: user[0].role as UserRole
          };
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
        
        if (user.role !== 'user' && user.role !== 'admin') {
          logger.error('Invalid user role in JWT:', { userId: user.id, role: user.role });
          throw new Error('Invalid user role');
        }

        const jwt: JWT = {
          ...token,
          id: user.id,
          email: user.email,
          name: user.name || '',
          role: user.role
        };
        return jwt;
      }
      return token as JWT;
    },
    async session({ session, token }) {
      logger.debug('Creating new session from token:', { 
        tokenId: token.id,
        tokenEmail: token.email,
        tokenRole: token.role 
      });

      if (token.role !== 'user' && token.role !== 'admin') {
        logger.error('Invalid token role:', { tokenId: token.id, role: token.role });
        throw new Error('Invalid token role');
      }

      session.user = {
        id: token.id,
        email: token.email,
        name: token.name || '',
        role: token.role
      };
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
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
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return null
    }
    return session.user
  } catch (error) {
    console.error('Auth verification error:', error)
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