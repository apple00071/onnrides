import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';

// Extend the built-in session types
declare module "next-auth" {
  interface User extends DefaultUser {
    role: "user" | "admin";
    id: string;
  }

  interface Session {
    user: User & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "user" | "admin";
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
          // Find user by email
          const user = await prisma.users.findUnique({
            where: { 
              email: credentials.email.toLowerCase() 
            },
            select: {
              id: true,
              email: true,
              password_hash: true,
              name: true,
              role: true,
              is_blocked: true
            }
          });

          if (!user) {
            throw new Error('No user found');
          }

          if (user.is_blocked) {
            throw new Error('Account is blocked');
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
            role: (user.role || 'user') as "user" | "admin"
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
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // If the url is relative, prefix it with the base URL
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // If the url is on the same domain, allow it
      if (new URL(url).origin === baseUrl) return url;
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