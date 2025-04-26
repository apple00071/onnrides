import { SignJWT, jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getServerSession, type DefaultSession, type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import logger from '@/lib/logger';
import type { JWT } from 'next-auth/jwt';

// Add the missing hashPassword function
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

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
    maxAge: 24 * 60 * 60, // 24 hours
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
      // Always allow internal URLs
      if (url.startsWith('/')) {
        // Ensure admin URLs redirect properly
        if (url.startsWith('/admin')) {
          return `${baseUrl}${url}`;
        }
        return url;
      }
      // Allow URLs on the same origin
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Default to admin dashboard for admin users
      return `${baseUrl}/admin/dashboard`;
    },
  },
  pages: {
    signIn: "/admin-login",
    error: "/admin-login",
  },
};

/**
 * Retrieves the current authenticated user from the session
 * @returns User object or null if not authenticated
 */
export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);
    return session?.user || null;
  } catch (error) {
    logger.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Compares a plain text password with a hashed password
 * @param plainPassword The plain text password to compare
 * @param hashedPassword The hashed password to compare against
 * @returns Boolean indicating if the passwords match
 */
export async function comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    logger.error('Error comparing passwords:', error);
    return false;
  }
} 