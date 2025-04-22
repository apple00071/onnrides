import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic'; // Ensure this is always evaluated

export default function AdminPage() {
  redirect('/admin/dashboard');
} 