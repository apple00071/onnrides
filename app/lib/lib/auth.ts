import NextAuth from 'next-auth';
import type { DefaultUser, NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { findOneBy } from '@/lib/db';
import { COLLECTIONS } from '@/lib/db';
import * as bcrypt from 'bcryptjs';

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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const dbUser = await findOneBy<DbUser>(COLLECTIONS.USERS, 'email', credentials.email);
          if (!dbUser?.passwordHash) return null;

          const isValid = await bcrypt.compare(credentials.password, dbUser.passwordHash);
          if (!isValid) return null;

          // For admin login, verify admin role
          if (credentials.isAdmin === 'true' && dbUser.role !== 'admin') {
            return null;
          }

          return {
            id: dbUser.id,
            email: dbUser.email,
            role: dbUser.role,
            name: dbUser.name
          };
        } catch (error) {
          console.error('Auth error:', error);
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