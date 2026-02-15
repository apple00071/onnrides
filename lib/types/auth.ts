export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string | null;
  created_at?: string;
  is_blocked?: boolean;
  documents?: {
    total: number;
    approved: number;
  };
  bookings_count?: number;
  deleted?: boolean;
}

declare module 'next-auth' {
  interface Session {
    user: User & {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: string;
  }
} 