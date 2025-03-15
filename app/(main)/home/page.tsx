'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';

// Server component that immediately redirects to the root page
export default function HomePage() {
  // Server-side redirect
  redirect('/');
  
  // This part won't execute due to the redirect, but is included as a fallback
  return null;
} 