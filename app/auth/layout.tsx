import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  // If user is already logged in, redirect to home page
  if (session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
} 