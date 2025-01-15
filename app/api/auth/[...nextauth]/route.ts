import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { findUserByEmail } from '@/lib/db';
import * as bcrypt from 'bcryptjs';
import logger from '@/lib/logger';
import type { User } from '@/lib/types';

// Database user type
interface DbUser {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  password_hash: string;
  created_at: Date | null;
  updated_at: Date | null;
}

// Custom user type with required fields
interface CustomUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
  name: string | null;
}

declare module 'next-auth' {
  interface User extends CustomUser {}
  interface Session {
    user: User;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends CustomUser {}
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials');
        }

        try {
          const user = await findUserByEmail(credentials.email);
          
          if (!user) {
            throw new Error('Invalid credentials');
          }

          if (user.is_blocked) {
            throw new Error('User is blocked');
          }

          const isValid = await bcrypt.compare(credentials.password, user.password_hash);
          
          if (!isValid) {
            throw new Error('Invalid credentials');
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
    signIn: '/login',
    error: '/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role as User['role'];
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as User['role'];
      }
      return session;
    }
  },
  session: {
    strategy: 'jwt'
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 