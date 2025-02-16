import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
    phone?: string | null;
    created_at?: string;
    is_blocked?: boolean;
  }

  interface Session {
    user: User;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
    phone?: string | null;
    created_at?: string;
    is_blocked?: boolean;
  }
}

declare module 'next-auth/next' {
  export function getServerSession(...args: any[]): Promise<Session | null>;
} 