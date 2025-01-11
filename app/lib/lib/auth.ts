import { NextRequest } from 'next/server';
import { jwtVerify, JWTPayload } from 'jose';
import * as db from './db';
import type { User, TokenPayload } from './types';

export async function verifyAuth(request: NextRequest): Promise<TokenPayload | null> {
  try {
    // Get token from cookie
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return null;
    }

    // Verify token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set');
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // Verify payload has required fields
    if (
      typeof payload.id !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null;
    }

    const tokenPayload: TokenPayload = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      iat: payload.iat,
      exp: payload.exp
    };

    // Verify user exists
    const user = await db.findOneBy<User>(db.COLLECTIONS.USERS, 'id', tokenPayload.id);
    if (!user) {
      return null;
    }

    return tokenPayload;
  } catch (error) {
    return null;
  }
}

export const authOptions = {
  secret: process.env.JWT_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.role = token.role;
      }
      return session;
    },
  },
}; 