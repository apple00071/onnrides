import { hash, compare } from 'bcryptjs';

/**
 * Hashes a password using bcryptjs
 */
export const hashPassword = async (password: string): Promise<string> => {
  return hash(password, 10);
};

/**
 * Compares a plaintext password with a hashed password
 */
export const comparePasswords = async (password: string, hashedPassword: string): Promise<boolean> => {
  return compare(password, hashedPassword);
}; 