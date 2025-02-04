import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: 'user' | 'admin';
      phone?: string | null;
    }
  }
  
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: 'user' | 'admin';
    phone?: string | null;
  }
}

declare module 'next-auth/next' {
  export function getServerSession(...args: any[]): Promise<Session | null>;
} 