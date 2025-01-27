import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { sql } from '@vercel/postgres';
import type { User as DbUser } from './schema';
import { findUserById } from './db';
import { NextResponse } from 'next/server';
import { getServerSession, type DefaultSession, type NextAuthOptions, type DefaultUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import logger from './logger';
import type { JWT } from 'next-auth/jwt';

interface IUser extends DefaultUser {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
}

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: IUser;
  }

  interface User extends IUser {}
}

declare module 'next-auth/jwt' {
  interface JWT extends IUser {}
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
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const result = await sql<DbUser>`
          SELECT * FROM users WHERE email = ${credentials.email} LIMIT 1
        `;
        const user = result.rows[0];
        
        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        } as IUser;
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
  },
  pages: {
    signIn: "/login",
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