import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import logger from '@/lib/logger';
import { query } from '@/lib/db';

// Extend the built-in session types
declare module "next-auth" {
  interface User extends DefaultUser {
    role: string;
    id: string;
  }

  interface Session {
    user: User & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    id: string;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials');
        }

        try {
          // Find user by email using PostgreSQL
          const result = await query(`
            SELECT 
              id,
              email,
              password_hash,
              name,
              role
            FROM users 
            WHERE email = $1
          `, [credentials.email.toLowerCase()]);

          const user = result.rows[0];

          if (!user) {
            throw new Error('No user found');
          }

          // Check password
          const isValid = await compare(credentials.password, user.password_hash || '');
          if (!isValid) {
            throw new Error('Invalid password');
          }

          // Return user without password
          return {
            id: user.id,
            email: user.email || '',
            name: user.name || '',
            role: user.role?.toLowerCase() || 'user'
          };
        } catch (error) {
          logger.error('Error in authorize:', error);
          throw error;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Ensure role is lowercase for consistency
        token.role = user.role.toLowerCase();
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // Ensure role is lowercase for consistency
        session.user.role = token.role.toLowerCase();
        session.user.id = token.id;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Always allow admin routes for admin users
      if (url.startsWith('/admin')) {
        return `${baseUrl}${url}`;
      }
      // If the url is relative, prefix it with the base URL
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // If the url is on the same domain, allow it
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      // Default to the base URL
      return baseUrl;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt'
  }
}; 