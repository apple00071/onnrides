import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        isAdmin: { label: 'Is Admin', type: 'boolean' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        try {
          logger.info('Attempting login with email:', { 
            email: credentials.email
          });

          const result = await query(
            'SELECT * FROM users WHERE email = $1 LIMIT 1',
            [credentials.email]
          );

          const user = result.rows[0];

          if (!user || !user.password_hash) {
            logger.debug('User not found or no password:', credentials.email);
            throw new Error('Invalid credentials');
          }

          const isValid = await compare(credentials.password, user.password_hash);

          if (!isValid) {
            logger.debug('Invalid password for user:', credentials.email);
            throw new Error('Invalid credentials');
          }

          // Check for admin access if attempting admin login
          if (credentials.isAdmin === 'true' && user.role !== 'admin') {
            logger.debug('Admin access denied for user:', credentials.email);
            throw new Error('Admin access required');
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name || '',
            role: user.role,
            phone: user.phone,
            created_at: user.created_at,
            is_blocked: user.is_blocked
          };
        } catch (error) {
          logger.error('Auth error:', error);
          throw error;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.phone = user.phone;
        token.created_at = user.created_at;
        token.is_blocked = user.is_blocked;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.phone = token.phone;
        session.user.created_at = token.created_at;
        session.user.is_blocked = token.is_blocked;
      }
      return session;
    }
  },
  debug: process.env.NODE_ENV === 'development'
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 