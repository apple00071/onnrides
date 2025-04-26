import { SignJWT, jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import type { User as DbUser } from './schema';
import { findUserById } from './db';
import { NextResponse } from 'next/server';
import { getServerSession, type DefaultSession, type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import logger from '@/lib/logger';
import type { JWT } from 'next-auth/jwt';

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    role: "user" | "admin";
  }

  interface Session extends DefaultSession {
    user: User & DefaultSession["user"];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: "user" | "admin";
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        isAdmin: { label: "Is Admin", type: "text" }
      },
      async authorize(credentials, req) {
        try {
          if (!credentials?.email || !credentials?.password) {
            logger.warn('Missing credentials');
            return null;
          }

          const user = await prisma.users.findUnique({
            where: { email: credentials.email }
          });
          
          if (!user || !user.password_hash) {
            logger.warn('User not found or no password:', credentials.email);
            return null;
          }

          // Check if this is an admin login attempt
          const isAdminLogin = credentials.isAdmin === 'true';
          const userRole = user.role?.toLowerCase() || 'user';
          
          if (isAdminLogin && userRole !== 'admin') {
            logger.warn('Non-admin user attempted admin login:', credentials.email);
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password_hash
          );

          if (!isPasswordValid) {
            logger.warn('Invalid password for user:', credentials.email);
            return null;
          }

          logger.info('User logged in successfully:', {
            userId: user.id,
            email: user.email,
            role: userRole
          });

          // Ensure name is always a string by using email as fallback
          const name = user.name || user.email || '';

          return {
            id: user.id,
            email: user.email || '',
            name,
            role: userRole as "user" | "admin"
          };
        } catch (error) {
          logger.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          id: token.id,
          email: token.email,
          name: token.name,
          role: token.role
        }
      };
    },
    async redirect({ url, baseUrl }) {
      // If the url is relative, prefix it with the base URL
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // If the url is on the same domain, allow it
      if (new URL(url).origin === baseUrl) return url;
      // Default to the base URL
      return baseUrl;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

export async function verifyAuth() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    return session.user;
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