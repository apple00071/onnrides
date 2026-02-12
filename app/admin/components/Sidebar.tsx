'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  FaHome,
  FaUsers,
  FaCar,
  FaCalendarAlt,
  FaFileAlt,
  FaSignOutAlt,
  FaExchangeAlt,
} from 'react-icons/fa';
import { signOut } from 'next-auth/react';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: FaHome },
  { name: 'Users', href: '/admin/users', icon: FaUsers },
  { name: 'Vehicles', href: '/admin/vehicles', icon: FaCar },
  { name: 'Bookings', href: '/admin/bookings', icon: FaCalendarAlt },
  { name: 'Vehicle Returns', href: '/admin/vehicle-returns', icon: FaExchangeAlt },
  { name: 'Documents', href: '/admin/documents', icon: FaFileAlt },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen flex-col justify-between border-r bg-white">
      <div className="px-4 py-6">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-2xl font-bold text-[#f26e24]">OnnRides</span>
        </div>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-4 py-2 text-gray-500 transition-all hover:text-gray-900',
                  {
                    'bg-gray-100 text-gray-900': active,
                  }
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="sticky inset-x-0 bottom-0 border-t border-gray-100 bg-white p-4">
        <button
          onClick={() => signOut({ callbackUrl: '/admin-login' })}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        >
          <FaSignOutAlt className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
} 