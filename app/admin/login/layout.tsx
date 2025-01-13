import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

interface LoginLayoutProps {
  children: ReactNode;
}

export default async function LoginLayout({ children }: LoginLayoutProps) {
  const session = await getServerSession(authOptions);

  // If already logged in as admin, redirect to dashboard
  if (session?.user?.role === 'admin') {
    redirect('/admin/dashboard');
  }

  return <>{children}</>;
} 