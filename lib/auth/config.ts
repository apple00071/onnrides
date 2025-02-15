import { type AuthOptions, type DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import type { User, UserRole } from '@/lib/types';
import { comparePasswords } from './utils';

declare module 'next-auth' {
  interface Session {
    user: User & DefaultSession['user'];
  }
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    phone: string | null;
    created_at: string;
    is_blocked: boolean;
  }
}

type TokenUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string | null;
  created_at: string;
  is_blocked: boolean;
};

type SessionUser = User & DefaultSession['user'];

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

          const isValid = await comparePasswords(credentials.password, user.password_hash || '');

          if (!isValid) {
            logger.debug('Invalid password for user:', credentials.email);
            return null;
          }

          // Check if admin login is requested but user is not an admin
          if (credentials.isAdmin === 'true' && user.role !== 'admin') {
            logger.debug('Admin access denied for user:', credentials.email);
            return null;
          }

          const userWithRole = {
            id: user.id,
            email: user.email,
            name: user.name || '',
            role: user.role as UserRole,
            phone: user.phone,
            created_at: user.created_at,
            is_blocked: user.is_blocked
          } satisfies User;

          return userWithRole;
        } catch (error) {
          logger.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin', // Redirect to sign-in page on error
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (trigger === 'signIn' && user) {
        const typedUser = user as User;
        const tokenUser: TokenUser = {
          id: typedUser.id,
          name: typedUser.name,
          email: typedUser.email,
          role: typedUser.role as UserRole,
          phone: typedUser.phone,
          created_at: typedUser.created_at,
          is_blocked: typedUser.is_blocked
        };
        return { ...token, ...tokenUser };
      }
      return token;
    },
    async session({ session, token }) {
      const tokenUser = token as TokenUser;
      const user = {
        ...session.user,
        id: tokenUser.id,
        name: tokenUser.name || '',
        email: tokenUser.email,
        role: tokenUser.role as UserRole,
        phone: tokenUser.phone,
        created_at: tokenUser.created_at,
        is_blocked: tokenUser.is_blocked
      } satisfies SessionUser;
      session.user = user;
      return session;
    }
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET
}; 