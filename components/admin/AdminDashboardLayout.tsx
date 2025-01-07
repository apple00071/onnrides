'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  UsersIcon, 
  TruckIcon, 
  CalendarIcon, 
  DocumentTextIcon,
  ChartBarIcon,
  BellIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const sidebarItems = [
    { name: 'Home', href: '/admin', icon: HomeIcon },
    { name: 'Vehicles', href: '/admin/vehicles', icon: TruckIcon },
    { name: 'Customers', href: '/admin/users', icon: UsersIcon },
    { name: 'Orders', href: '/admin/bookings', icon: CalendarIcon },
    { name: 'Documents', href: '/admin/documents', icon: DocumentTextIcon },
    { name: 'Reports', href: '/admin/reports', icon: ChartBarIcon },
  ];

  const currentPage = sidebarItems.find(item => item.href === pathname);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Link href="/admin" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#f26e24] rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">O</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">ONNRIDES</span>
          </Link>
        </div>
        <nav className="flex-1 mt-6 px-3 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? 'bg-[#f26e24] bg-opacity-10 text-[#f26e24]'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <item.icon className={`mr-3 h-5 w-5 ${
                  isActive ? 'text-[#f26e24]' : 'text-gray-400'
                }`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Top navigation */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center">
            <h1 className="text-2xl font-semibold text-gray-900">
              {currentPage?.name || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-gray-500">
              <BellIcon className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-2">
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <span className="text-sm text-gray-700">Admin</span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
} 