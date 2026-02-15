import { NextAuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { DefaultSession, DefaultUser } from 'next-auth';
import logger from '@/lib/logger';
import { query } from '@/lib/db';


export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        isAdmin: { label: "Is Admin", type: "text" }
      },
      async authorize(credentials, req) {
        try {
          if (!credentials?.email || !credentials?.password) {
            logger.warn('Missing credentials');
            return null;
          }

          const result = await query(`
            SELECT id, email, name, password_hash, role, is_blocked
            FROM users
            WHERE email = $1
          `, [credentials.email]);

          const user = result.rows[0];

          if (!user || !user.password_hash) {
            logger.warn('User not found or no password:', credentials.email);
            return null;
          }

          // Check if this is an admin login attempt
          const isAdminLogin = credentials.isAdmin === 'true';
          const userRole = user.role?.toLowerCase() || 'user';

          if (isAdminLogin && userRole !== 'admin') {
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
            role: userRole
          });

          // Ensure name is always a string by using email as fallback
          const name = user.name || user.email || '';

          return {
            id: user.id,
            email: user.email || '',
            name,
            role: userRole as "user" | "admin"
          };
        } catch (error) {
          logger.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          id: token.id,
          email: token.email,
          name: token.name,
          role: token.role
        }
      };
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
    signIn: "/login",
    error: "/login",
  },
};

export async function verifyAuth() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    return session.user;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function verifyAdmin(request: Request): Promise<boolean> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return false;
  }

  return session.user?.role === 'admin';
}

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
} 