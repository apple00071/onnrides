import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { findUserByEmail } from '@/app/lib/lib/db';
import * as bcrypt from 'bcryptjs';
import logger from '@/lib/logger';

// Database user type
interface DbUser {
  id: string;
  email: string;
  role: string | null;
  password: string | null;
  name: string | null;
  is_blocked: boolean | null;
  is_verified: boolean | null;
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
            return null;
          }

          // Get user from database
          const user = await findUserByEmail(credentials.email);
          
          if (!user?.password) {
            logger.warn('Login attempt with non-existent email:', credentials.email);
            return null;
          }

          // Verify password
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            logger.warn('Invalid password attempt for email:', credentials.email);
            return null;
          }

          // Check if user is blocked
          if (user.is_blocked) {
            logger.warn('Blocked user attempted to login:', credentials.email);
            return null;
          }

          // For admin login, verify admin role
          if (credentials.isAdmin === 'true' && user.role !== 'admin') {
            logger.warn('Non-admin user attempted admin login:', credentials.email);
            return null;
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
  events: {
    async signOut() {
      try {
        // Clear any server-side session data if needed
        logger.info('User signed out successfully');
      } catch (error) {
        logger.error('Error during sign out:', error);
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false, // Disable debug mode in production
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 