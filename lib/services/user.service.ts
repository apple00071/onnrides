import { User } from '../firebase/models';
import { getAdminDb } from '../firebase/admin';

export class UserService {
  private static getDb() {
    return getAdminDb();
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const usersRef = this.getDb().collection('users');
      const snapshot = await usersRef.where('email', '==', email).limit(1).get();
      
      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as User;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  static async updateUser(id: string, data: Partial<User>): Promise<void> {
    try {
      await this.getDb().collection('users').doc(id).update({
        ...data,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await this.getDb().collection('users').add({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true // Ensure new users are active by default
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
} 