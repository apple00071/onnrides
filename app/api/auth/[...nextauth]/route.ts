import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

// Use the authOptions from lib/auth.ts to maintain consistency
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 