import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth/next';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/admin-login',
    error: '/admin-login',
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "user" | "admin";
      }
      return session;
    }
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        isAdmin: { label: "Is Admin", type: "text" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            logger.warn('Missing credentials');
            return null;
          }

          const user = await prisma.users.findUnique({
            where: {
              email: credentials.email
            },
            select: {
              id: true,
              email: true,
              name: true,
              password_hash: true,
              role: true,
              is_blocked: true
            }
          });
          
          if (!user || !user.password_hash) {
            logger.warn('User not found or no password:', credentials.email);
            return null;
          }

          // Check if the user account is blocked
          if (user.is_blocked) {
            logger.warn('Blocked user attempted to login:', credentials.email);
            throw new Error('Your account has been blocked. Please contact support.');
          }
          
          // Check if this is an admin login attempt
          const isAdmin = user.role.toLowerCase() === 'admin';
          const isAdminLogin = credentials.isAdmin === 'true';
          if (isAdminLogin && !isAdmin) {
            logger.warn('Non-admin user attempted admin login:', credentials.email);
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password_hash
          );

          if (!isPasswordValid) {
            logger.warn('Invalid password for user:', credentials.email);
            return null;
          }

          logger.info('User logged in successfully:', {
            userId: user.id,
            email: user.email,
            role: user.role
          });

          // Ensure name is always a string by using email as fallback
          const name = user.name || user.email;

          return {
            id: user.id,
            email: user.email,
            name,
            role: user.role.toLowerCase() as "user" | "admin"
          };
        } catch (error) {
          logger.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  events: {
    async signIn({ user }) {
      logger.info('User signed in', { userId: user.id });
    }
  }
}

export async function getCurrentUser() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return null;
    }
    return session.user;
  } catch (error) {
    logger.error('Error getting current user:', error);
    return null;
  }
}

export async function validateUser(email: string, password: string) {
  try {
    const user = await prisma.users.findUnique({
      where: { email }
    });

    if (!user || !user.password_hash) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    return isValid ? user : null;
  } catch (error) {
    logger.error('Error validating user:', error);
    return null;
  }
}

export async function comparePasswords(password: string, hashedPassword: string) {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    logger.error('Error comparing passwords:', error);
    return false;
  }
}

export async function hashPassword(password: string) {
  try {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw error;
  }
} 