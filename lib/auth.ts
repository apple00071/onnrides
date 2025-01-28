import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { query } from '@/lib/db';
import type { User } from '@/lib/db/schema';
import { NextResponse } from 'next/server';
import { getServerSession, type AuthOptions, NextAuthOptions } from 'next-auth';
import type { DefaultJWT, JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import logger from './logger';
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
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        isAdmin: { label: "Is Admin", type: "text" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Please enter your email and password");
          }

          const result = await query(
            'SELECT * FROM users WHERE email = $1 LIMIT 1',
            [credentials.email]
          );

          const user = result.rows[0];

          if (!user || !user.password_hash) {
            throw new Error("Invalid email or password");
          }

          const isPasswordValid = await compare(
            credentials.password,
            user.password_hash
          );

          if (!isPasswordValid) {
            throw new Error("Invalid email or password");
          }

          const isAdminLogin = credentials.isAdmin === 'true';

          // For admin login, require admin role
          if (isAdminLogin && user.role !== 'admin') {
            throw new Error("AccessDenied");
          }

          // For regular login, prevent admin from using it
          if (!isAdminLogin && user.role === 'admin') {
            throw new Error("Please use the admin login page");
          }

          const userInfo: UserInfo = {
            id: user.id,
            email: user.email,
            name: user.name || "",
            role: user.role as UserRole,
          };

          return userInfo;
        } catch (error) {
          logger.error('Auth error:', error);
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
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
      return {
        ...session,
        user: {
          id: token.id,
          email: token.email,
          name: token.name || "",
          role: token.role as UserRole,
        },
      };
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_DOMAIN : undefined,
      },
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

export async function getCurrentUser() {
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