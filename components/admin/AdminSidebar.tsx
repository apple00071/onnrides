'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { FaSignOutAlt } from 'react-icons/fa';

interface MenuItem {
  href: string;
  label: string;
  icon: React.ComponentType;
}

interface AdminSidebarProps {
  menuItems: MenuItem[];
}

export default function AdminSidebar({ menuItems }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b">
          <span className="text-xl font-bold text-[#f26e24]">Admin Panel</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-[#f26e24] text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {Icon && <Icon className="h-5 w-5" />}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sign Out Button */}
        <div className="border-t p-4">
          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="flex w-full items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <FaSignOutAlt className="h-5 w-5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
} 