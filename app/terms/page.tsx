'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='container mx-auto px-4 py-8 max-w-4xl'>
        <Link href='/' className='inline-flex items-center text-gray-600 hover:text-gray-900 mb-6'>
          <ArrowLeft className='w-4 h-4 mr-2' />
          Back to Home
        </Link>
        <h1 className='text-4xl font-bold mb-8 text-gray-900'>Terms & Conditions</h1>
      </div>
    </div>
  );
}
