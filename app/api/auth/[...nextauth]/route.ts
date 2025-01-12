import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { findOneBy } from '@/lib/db';
import { COLLECTIONS } from '@/lib/db';
import * as bcrypt from 'bcryptjs';
import logger from '@/lib/logger';

// Database user type
interface DbUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
  passwordHash: string;
  name: string;
}

// Custom user type with required fields
interface CustomUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
  name: string;
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
            return null;
          }

          // Get user from database
          const user = await findOneBy<DbUser>(COLLECTIONS.USERS, 'email', credentials.email);
          
          if (!user?.passwordHash) {
            logger.warn('Login attempt with non-existent email:', credentials.email);
            return null;
          }

          // Verify password
          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isValid) {
            logger.warn('Invalid password attempt for email:', credentials.email);
            return null;
          }

          // For admin login, verify admin role
          if (credentials.isAdmin === 'true' && user.role !== 'admin') {
            logger.warn('Non-admin user attempted admin login:', credentials.email);
            return null;
          }

          logger.info('User logged in successfully:', user.email, 'Role:', user.role);
          return {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name
          };
        } catch (error) {
          logger.error('Auth error:', error);
          return null;
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
    },
    async redirect({ url, baseUrl }) {
      // Handle admin routes
      if (url.startsWith('/admin')) {
        return url;
      }
      // Default redirect
      return baseUrl;
    }
  },
  pages: {
    signIn: '/auth/signin',
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