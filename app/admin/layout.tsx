'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaHome, FaUsers, FaCar, FaBookmark, FaFileAlt, FaSignOutAlt } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/admin/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Logged out successfully');
        router.push('/admin/login');
        // Force a hard refresh to clear any cached state
        router.refresh();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to logout');
      }
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to logout');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-[#f26e24]">Admin Dashboard</h1>
        </div>
        <nav className="mt-4">
          <Link 
            href="/admin"
            className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-100"
          >
            <FaHome className="mr-3" />
            Dashboard
          </Link>
          <Link 
            href="/admin/users"
            className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-100"
          >
            <FaUsers className="mr-3" />
            Users
          </Link>
          <Link 
            href="/admin/vehicles"
            className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-100"
          >
            <FaCar className="mr-3" />
            Vehicles
          </Link>
          <Link 
            href="/admin/bookings"
            className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-100"
          >
            <FaBookmark className="mr-3" />
            Bookings
          </Link>
          <Link 
            href="/admin/documents"
            className="flex items-center px-4 py-3 text-gray-600 hover:bg-gray-100"
          >
            <FaFileAlt className="mr-3" />
            Documents
          </Link>
          <button 
            onClick={handleSignOut}
            className="flex items-center w-full px-4 py-3 text-gray-600 hover:bg-gray-100 hover:text-red-600"
          >
            <FaSignOutAlt className="mr-3" />
            Sign Out
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50">
        {children}
      </div>
    </div>
  );
} 