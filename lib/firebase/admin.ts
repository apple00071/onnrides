import * as admin from 'firebase-admin';
import logger from '@/lib/logger';

let firebaseAdmin: admin.app.App | null = null;

function validateFirebaseConfig() {
  const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    logger.warn('Missing Firebase configuration:', missingVars);
    return false;
  }

  return true;
}

export function getFirebaseAdmin(): admin.app.App {
  if (!firebaseAdmin) {
    try {
      // Check if an app already exists
      try {
        firebaseAdmin = admin.app();
      } catch {
        // Check if we have all required environment variables
        if (!validateFirebaseConfig()) {
          logger.warn('Firebase Admin not initialized due to missing configuration');
          // Return a mock app that logs operations but doesn't actually do anything
          return {
            firestore: () => ({
              collection: () => ({
                doc: () => ({
                  get: async () => ({ exists: false, data: () => ({}) }),
                  set: async () => {},
                  update: async () => {},
                  delete: async () => {},
                }),
                where: () => ({
                  limit: () => ({
                    get: async () => ({ empty: true, docs: [] }),
                  }),
                }),
                add: async () => ({ id: 'mock-id' }),
                get: async () => ({ empty: true, docs: [] }),
              }),
            }),
            auth: () => ({
              verifyIdToken: async () => ({}),
              createUser: async () => ({}),
              updateUser: async () => ({}),
              deleteUser: async () => {},
            }),
            storage: () => ({
              bucket: () => ({
                file: () => ({
                  save: async () => {},
                  delete: async () => {},
                }),
              }),
            }),
            messaging: () => ({
              send: async () => 'mock-message-id',
            }),
          } as unknown as admin.app.App;
        }

        // Initialize new app if none exists and we have all required config
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
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      throw new Error('Firebase API Key not configured');
    }

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
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      throw new Error('Firebase API Key not configured');
    }

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