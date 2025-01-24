import { type NextAuthOptions } from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { users, roleEnum } from '@/lib/db/schema';

type UserRole = typeof roleEnum.enumValues[number];

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db) as any,
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error('Missing credentials');
          return null;
        }

        try {
          console.log('Environment:', process.env.NODE_ENV);
          console.log('Database URL:', process.env.DATABASE_URL?.slice(0, 35) + '...');
          console.log('Attempting to authenticate user:', credentials.email);
          
          // Test database connection
          try {
            console.log('Testing database connection...');
            const testQuery = await db.select().from(users).limit(1);
            console.log('Database test query result:', JSON.stringify(testQuery));
            console.log('Database connection test:', testQuery.length > 0 ? 'successful' : 'no users found');
          } catch (dbError) {
            console.error('Database connection test failed:', dbError);
            if (dbError instanceof Error) {
              console.error('Database error details:', {
                message: dbError.message,
                stack: dbError.stack,
                name: dbError.name
              });
            }
          }
          
          console.log('Querying user from database...');
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email))
            .limit(1);

          if (!user) {
            console.error('User not found:', credentials.email);
            return null;
          }

          console.log('User found:', { id: user.id, email: user.email, role: user.role });

          if (!user?.password_hash) {
            console.error('User has no password hash:', credentials.email);
            return null;
          }

          console.log('Comparing passwords...');
          const passwordMatch = await bcrypt.compare(credentials.password, user.password_hash);

          if (!passwordMatch) {
            console.error('Password does not match for user:', credentials.email);
            return null;
          }

          console.log('Authentication successful for user:', credentials.email);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          };
        } catch (error) {
          console.error('Database or auth error:', error);
          if (error instanceof Error) {
            console.error('Error details:', {
              message: error.message,
              stack: error.stack,
              name: error.name
            });
          }
          throw error;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session?.name) {
        token.name = session.name;
      }
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    }
  },
  debug: true // Enable debug mode to see more logs
}; 