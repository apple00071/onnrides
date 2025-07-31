import { adminDb } from './config';
import { db as clientDb } from './clientApp';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';

// Generic get document by ID
export async function getDocById<T>(collectionName: string, id: string): Promise<T | null> {
  try {
    const docRef = doc(clientDb, collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (error) {
    console.error(`Error getting ${collectionName} document:`, error);
    throw error;
  }
}

// Generic query documents
export async function queryDocs<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<T[]> {
  try {
    const q = query(collection(clientDb, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as T[];
  } catch (error) {
    console.error(`Error querying ${collectionName} collection:`, error);
    throw error;
  }
}

// Generic create document
export async function createDoc<T extends DocumentData>(
  collectionName: string,
  data: T
): Promise<string> {
  try {
    const docRef = await addDoc(collection(clientDb, collectionName), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error creating ${collectionName} document:`, error);
    throw error;
  }
}

// Generic update document
export async function updateDocById<T extends DocumentData>(
  collectionName: string,
  id: string,
  data: Partial<T>
): Promise<void> {
  try {
    const docRef = doc(clientDb, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error(`Error updating ${collectionName} document:`, error);
    throw error;
  }
}

// Generic delete document
export async function deleteDocById(
  collectionName: string,
  id: string
): Promise<void> {
  try {
    const docRef = doc(clientDb, collectionName, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting ${collectionName} document:`, error);
    throw error;
  }
}

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  VEHICLES: 'vehicles',
  BOOKINGS: 'bookings',
  DOCUMENTS: 'documents',
  SETTINGS: 'settings'
} as const; 