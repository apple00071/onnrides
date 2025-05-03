import { getServerSession, type DefaultSession, type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { compare, hash } from 'bcryptjs';
import logger from '@/lib/logger';
import type { JWT } from 'next-auth/jwt';
import { prisma } from './prisma';

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    role: "user" | "admin";
  }

  interface Session extends DefaultSession {
    user: User & DefaultSession["user"];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: "user" | "admin";
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter your email and password');
        }

        try {
          const user = await prisma.users.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              password_hash: true,
              is_blocked: true
            }
          });

          if (!user || !user.password_hash) {
            throw new Error('No user found with this email');
          }

          const isPasswordValid = await compare(
            credentials.password,
            user.password_hash
          );

          if (!isPasswordValid) {
            throw new Error('Invalid password');
          }

          if (user.is_blocked) {
            throw new Error('Your account has been blocked');
          }

          // Ensure all required fields are non-null
          if (!user.email || !user.name) {
            throw new Error('Invalid user data');
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: (user.role as "user" | "admin") || "user"
          };
        } catch (error) {
          logger.error('Error in authorize:', error);
          throw error;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // Initial sign in
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      } else if (trigger === "update" && session) {
        // Session update
        return { ...token, ...session.user };
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/**
 * Verifies if a user is authenticated and optionally checks their role
 */
export const verifyAuth = async (session: any | null, allowedRoles?: string[]): Promise<boolean> => {
  if (!session) return false;
  
  if (!allowedRoles) return true;
  
  return allowedRoles.includes(session.user?.role);
};

export const hashPassword = async (password: string): Promise<string> => {
  return hash(password, 10);
};

export const comparePasswords = async (password: string, hash: string): Promise<boolean> => {
  return compare(password, hash);
};

export const verifyAdmin = async (request: Request): Promise<boolean> => {
  const session = await getServerSession(authOptions);
  return session?.user?.role === 'admin';
};

export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return null;
    }

    const user = await prisma.users.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_blocked: true
      }
    });

    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
} 