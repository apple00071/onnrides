import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { findUserByEmail } from '@/app/lib/lib/db';
import * as bcrypt from 'bcryptjs';
import logger from '@/lib/logger';

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
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        isAdmin: { label: "Is Admin", type: "boolean", optional: true }
      },
      async authorize(credentials): Promise<CustomUser | null> {
        try {
          if (!credentials?.email || !credentials?.password) {
            logger.warn('Missing email or password');
            throw new Error('Email and password are required');
          }

          // Get user from database
          const user = await findUserByEmail(credentials.email);
          
          if (!user?.password_hash) {
            logger.warn('Login attempt with non-existent email:', credentials.email);
            throw new Error('Invalid email or password');
          }

          // Verify password
          const isValid = await bcrypt.compare(credentials.password, user.password_hash);
          if (!isValid) {
            logger.warn('Invalid password attempt for email:', credentials.email);
            throw new Error('Invalid email or password');
          }

          // For admin login, verify admin role
          if (credentials.isAdmin === 'true') {
            if (user.role !== 'admin') {
              logger.warn('Non-admin user attempted admin login:', credentials.email);
              throw new Error('Unauthorized: Admin access required');
            }
          }

          // Convert role to proper type
          const role = user.role === 'admin' ? 'admin' : 'user';

          logger.info('User logged in successfully:', user.email, 'Role:', role);
          return {
            id: user.id,
            email: user.email,
            role,
            name: user.name
          };
        } catch (error) {
          logger.error('Auth error:', error);
          // Pass through the error message
          throw error instanceof Error ? error : new Error('Authentication failed');
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          id: token.id,
          email: token.email,
          role: token.role,
          name: token.name
        }
      };
    }
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signin',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 