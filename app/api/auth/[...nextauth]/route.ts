import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import logger from '@/lib/logger';
import type { User } from '@/lib/types';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials');
        }

        try {
          const result = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email))
            .limit(1);
          
          const user = result[0];
          if (!user) {
            throw new Error('Invalid credentials');
          }

          const isValid = await bcrypt.compare(credentials.password, user.password_hash);
          if (!isValid) {
            throw new Error('Invalid credentials');
          }

          // Check if this is an admin login attempt
          const isAdminRoute = req?.headers?.referer?.includes('/admin');
          if (isAdminRoute && user.role !== 'admin') {
            throw new Error('Unauthorized');
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          };
        } catch (error) {
          logger.error('Auth error:', error);
          throw error;
        }
      }
    })
  ],
  pages: {
    signIn: '/admin/login',
    error: '/admin/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role;
        session.user.name = token.name as string | null;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/admin')) {
        return url;
      }
      return baseUrl;
    }
  },
  session: {
    strategy: 'jwt'
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 