import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import logger from '@/lib/logger';

type UserRole = 'user' | 'admin';

interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
}

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          // Find user by email
          const result = await query(
            'SELECT * FROM users WHERE email = $1 LIMIT 1',
            [credentials.email]
          );
          const user = result.rows[0];

          if (!user) {
            throw new Error('No user found with this email');
          }

          // Check if user is blocked
          if (user.is_blocked) {
            throw new Error('Your account has been blocked. Please contact support.');
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.password_hash
          );

          if (!isValidPassword) {
            throw new Error('Invalid password');
          }

          // Update last login timestamp
          await query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
          );

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role as UserRole
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