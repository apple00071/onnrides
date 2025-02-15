import { type AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { User, UserRole } from '../types/auth';

declare module 'next-auth' {
  interface Session {
    user: User;
  }
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        isAdmin: { label: 'Is Admin', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        try {
          const result = await query(
            'SELECT * FROM users WHERE email = $1 LIMIT 1',
            [credentials.email]
          );
          const user = result.rows[0];

          if (!user) {
            logger.debug('User not found:', credentials.email);
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password, user.password_hash || '');

          if (!isValid) {
            logger.debug('Invalid password for user:', credentials.email);
            return null;
          }

          // Check if admin login is requested but user is not an admin
          if (credentials.isAdmin === 'true' && user.role !== 'admin') {
            logger.debug('Admin access denied for user:', credentials.email);
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name || '',
            role: user.role as UserRole
          };
        } catch (error) {
          logger.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/auth/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name || '';
        token.email = user.email;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          name: token.name,
          email: token.email,
          role: token.role
        }
      };
    }
  },
  secret: process.env.NEXTAUTH_SECRET
}; 