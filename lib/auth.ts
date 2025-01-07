import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import pool from './db';
import { RequestCookies } from 'next/dist/server/web/spec-extension/cookies';

// Get JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

// Create secret for jose
const secret = new TextEncoder().encode(JWT_SECRET);

interface JWTPayload {
  id: string;
  email: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

export interface UserJwtPayload {
  id: string | number;
  email: string;
  role: string;
  [key: string]: any;  // Add index signature for JWT compatibility
}

interface TokenPayload {
  id: string;
  email: string;
  role: string;
  [key: string]: string; // Add index signature for JWTPayload compatibility
}

export async function generateToken(payload: TokenPayload): Promise<string> {
  const token = await new SignJWT({
    ...payload,
    iss: 'onnrides',
    aud: 'onnrides-users'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);

  return token;
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: payload.id as string,
      email: payload.email as string,
      role: payload.role as string
    };
  } catch (error) {
    console.error('Token verification error:', error);
    throw new Error('Invalid token');
  }
}

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string) {
  return await bcrypt.compare(password, hashedPassword);
}

export async function createUser(email: string, password: string, role: string = 'user') {
  const hashedPassword = await hashPassword(password);
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Insert user
    const userResult = await client.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
      [email, hashedPassword, role]
    );
    
    // Create empty profile
    await client.query(
      'INSERT INTO profiles (user_id) VALUES ($1)',
      [userResult.rows[0].id]
    );
    
    await client.query('COMMIT');
    return userResult.rows[0].id;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function validateUser(email: string, password: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return null;
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role
    };
  } finally {
    client.release();
  }
}

export function createAuthCookie(token: string) {
  return {
    name: 'token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 24 * 60 * 60 // 24 hours
  };
}

export function clearAuthCookie() {
  return {
    name: 'token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0
  };
}

// Helper function to get token from cookies
export async function getTokenFromCookies(cookies: RequestCookies): Promise<string | null> {
  const token = cookies.get('token')?.value;
  return token || null;
}

// Helper function to get current user from cookies
export async function getCurrentUser(cookies: RequestCookies): Promise<UserJwtPayload | null> {
  try {
    const token = await getTokenFromCookies(cookies);
    if (!token) {
      console.log('No token found in cookies');
      return null;
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      console.log('Token verification failed');
      return null;
    }
    
    // Get document verification status
    const client = await pool.connect();
    try {
      // Check if all required documents are approved
      const result = await client.query(`
        WITH required_docs AS (
          SELECT 'dl_front' as doc_type
          UNION SELECT 'dl_back'
          UNION SELECT 'aadhar_front'
          UNION SELECT 'aadhar_back'
        )
        SELECT 
          CASE 
            WHEN COUNT(DISTINCT rd.doc_type) = (
              SELECT COUNT(*) FROM required_docs
            ) AND COUNT(*) = COUNT(CASE WHEN ds.status = 'approved' THEN 1 END)
            THEN true
            ELSE false
          END as is_documents_verified
        FROM required_docs rd
        LEFT JOIN document_submissions ds ON ds.document_type = rd.doc_type AND ds.user_id = $1
      `, [decoded.id]);

      return {
        ...decoded,
        isDocumentsVerified: result.rows[0]?.is_documents_verified || false
      };
    } catch (dbError) {
      console.error('Database error in getCurrentUser:', dbError);
      // Return user data without document verification status
      return {
        ...decoded,
        isDocumentsVerified: false
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}

// Helper function to verify auth in API routes
export async function verifyAuth(request: NextRequest): Promise<JWTPayload | null> {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: payload.id as string,
      email: payload.email as string,
      role: payload.role as 'user' | 'admin',
      iat: payload.iat as number,
      exp: payload.exp as number
    };
  } catch (error) {
    return null;
  }
}

// Helper function to require auth in API routes
export async function requireAuth(request: NextRequest, requireAdmin = false) {
  const user = await verifyAuth(request);
  
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (requireAdmin && user.role !== 'admin') {
    return NextResponse.json({ message: 'Access denied' }, { status: 403 });
  }

  return user;
}

// Helper function to get current user with database profile
export async function getCurrentUserWithProfile(cookies: RequestCookies): Promise<any | null> {
  try {
    const user = await getCurrentUser(cookies);
    if (!user) {
      return null;
    }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT u.id, u.email, u.role, p.* 
         FROM users u 
         LEFT JOIN profiles p ON u.id = p.user_id 
         WHERE u.id = $1`,
        [user.id]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
} 