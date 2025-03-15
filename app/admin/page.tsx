import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic'; // Ensure this is always evaluated

export default function AdminRootPage() {
  // This ensures the redirect happens server-side
  redirect('/admin/dashboard');
  // This return is just for TypeScript
  return null;
} 