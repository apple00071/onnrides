'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export function NextAuthTest() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') {
    return <div className="p-4 bg-blue-100 rounded">Loading session...</div>;
  }
  
  if (status === 'unauthenticated') {
    return (
      <div className="p-4 bg-yellow-100 rounded">
        <p>Not authenticated</p>
        <button 
          onClick={() => signIn()} 
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Sign In
        </button>
      </div>
    );
  }
  
  return (
    <div className="p-4 bg-green-100 rounded">
      <p>✅ NextAuth working!</p>
      <p>User: {session?.user?.email}</p>
      <p>Role: {session?.user?.role}</p>
      <button 
        onClick={() => signOut()} 
        className="mt-2 px-4 py-2 bg-red-500 text-white rounded"
      >
        Sign Out
      </button>
    </div>
  );
}