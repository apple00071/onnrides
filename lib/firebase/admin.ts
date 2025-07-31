import * as admin from 'firebase-admin';
import logger from '@/lib/logger';

let firebaseAdmin: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App {
  if (!firebaseAdmin) {
    try {
      // Check if an app already exists
      try {
        firebaseAdmin = admin.app();
      } catch {
        // Initialize new app if none exists
        firebaseAdmin = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
          databaseURL: process.env.FIREBASE_DATABASE_URL,
        });
      }
      logger.info('Firebase Admin initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin:', error);
      throw error;
    }
  }
  return firebaseAdmin;
}

// Export Firebase Admin services
export function getAdminDb() {
  return getFirebaseAdmin().firestore();
}

export function getAdminAuth() {
  return getFirebaseAdmin().auth();
}

export function getAdminStorage() {
  return getFirebaseAdmin().storage();
}

interface FirebaseAuthResponse {
  idToken: string;
  email: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  registered?: boolean;
}

interface FirebaseAuthError {
  error: {
    code: number;
    message: string;
  };
}

function isFirebaseAuthError(data: any): data is FirebaseAuthError {
  return 'error' in data && typeof data.error === 'object' && 'message' in data.error;
}

// Helper function to sign in with email/password
export async function signInWithEmailPassword(email: string, password: string): Promise<FirebaseAuthResponse> {
  try {
    console.log('Attempting to sign in with:', email);
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    const data = await response.json();
    console.log('Firebase Auth response:', {
      status: response.status,
      ok: response.ok,
      data: isFirebaseAuthError(data) ? { error: data.error } : { success: true }
    });

    if (!response.ok || isFirebaseAuthError(data)) {
      const errorMessage = isFirebaseAuthError(data) ? data.error.message : 'Authentication failed';
      console.error('Sign in error details:', {
        status: response.status,
        error: isFirebaseAuthError(data) ? data.error : undefined,
        message: errorMessage
      });
      throw new Error(errorMessage);
    }

    return data as FirebaseAuthResponse;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
}

// Helper function to create a new user with email/password
export async function createUserWithEmailPassword(email: string, password: string): Promise<FirebaseAuthResponse> {
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || isFirebaseAuthError(data)) {
      const errorMessage = isFirebaseAuthError(data) ? data.error.message : 'User creation failed';
      console.error('Sign up error:', errorMessage);
      throw new Error(errorMessage);
    }

    return data as FirebaseAuthResponse;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
} 