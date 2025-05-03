import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import logger from '@/lib/logger';
import { UserRole, AuthUser, DbUser, DbQueryResult } from '@/lib/types';

declare module 'next-auth' {
  interface User extends AuthUser {}
  interface Session {
    user: AuthUser;
  }
  interface JWT {
    id: string;
    role: UserRole;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials): Promise<AuthUser | null> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          const { rows: [user] } = await query<DbQueryResult<DbUser>>(
            'SELECT id, name, email, role, password, "isBlocked" FROM users WHERE email = $1 LIMIT 1',
            [credentials.email]
          );

          if (!user) {
            throw new Error('No user found with this email');
          }

          if (user.isBlocked) {
            throw new Error('Your account has been blocked. Please contact support.');
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isValidPassword) {
            throw new Error('Invalid password');
          }

          await query<DbQueryResult<never>>(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
          );

          const authUser: AuthUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as UserRole
          };

          return authUser;
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
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    }
  },
  session: {
    strategy: 'jwt'
  }
};