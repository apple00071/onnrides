import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getAdminAuth, signInWithEmailPassword, createUserWithEmailPassword } from './firebase/admin';
import { UserService } from './services/user.service';
import { User } from './firebase/models';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing credentials');
        }

        try {
          // First check if user exists in Firestore
          const firestoreUser = await UserService.getUserByEmail(credentials.email);
          console.log('Firestore user found:', firestoreUser ? 'yes' : 'no');

          if (!firestoreUser) {
            console.log('No Firestore user found, authentication failed');
            throw new Error('User not found');
          }

          if (!firestoreUser.isActive) {
            console.log('User account is inactive');
            throw new Error('User account is inactive');
          }

          try {
            // Try to sign in with Firebase Auth
            const authResult = await signInWithEmailPassword(credentials.email, credentials.password);
            console.log('Firebase Auth successful');

            return {
              id: firestoreUser.id,
              email: firestoreUser.email,
              name: firestoreUser.name,
              role: firestoreUser.role,
              image: firestoreUser.avatar,
            };
          } catch (authError: any) {
            console.log('Firebase Auth error:', authError.message);

            // If user not found in Auth, create them
            if (authError.message === 'EMAIL_NOT_FOUND') {
              console.log('Creating user in Firebase Auth');
              await createUserWithEmailPassword(credentials.email, credentials.password);

              return {
                id: firestoreUser.id,
                email: firestoreUser.email,
                name: firestoreUser.name,
                role: firestoreUser.role,
                image: firestoreUser.avatar,
              };
            }

            // If it's an invalid password, throw appropriate error
            if (authError.message === 'INVALID_PASSWORD') {
              throw new Error('Invalid credentials');
            }

            throw authError;
          }
        } catch (error) {
          console.error('Auth error:', error);
          throw error;
        }
      }
    })
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
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
        session.user.role = token.role as User['role'];
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

export async function comparePasswords(password: string, hashedPassword: string) {
  return bcrypt.compare(password, hashedPassword);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
} 