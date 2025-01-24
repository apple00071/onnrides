import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: 'user' | 'admin';
    }
  }
  
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: 'user' | 'admin';
  }
}

declare module 'next-auth/next' {
  export function getServerSession(...args: any[]): Promise<Session | null>;
} 