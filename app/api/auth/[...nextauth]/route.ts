import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { findOneBy } from '@/lib/db';
import { COLLECTIONS } from '@/lib/db';
import bcrypt from 'bcryptjs';
import type { User } from '@/lib/types';

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: 'user' | 'admin';
    }
  }
  interface User {
    id: string;
    email: string;
    role: 'user' | 'admin';
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: 'user' | 'admin';
  }
}

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await findOneBy<User>(COLLECTIONS.USERS, 'email', credentials.email);
          if (!user) return null;

          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            role: user.role
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // If it's an admin route, keep it
      if (url.startsWith('/admin')) {
        return url;
      }
      return url;
    }
  }
});

export { handler as GET, handler as POST } 