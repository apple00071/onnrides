'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { FaHome, FaCar, FaUsers, FaBookmark, FaEnvelope, FaWhatsapp, FaQrcode, FaTrash, FaSignOutAlt } from 'react-icons/fa';
import { Sidebar, SidebarBody, SidebarLink, useSidebar, SidebarProvider } from '@/components/admin/Sidebar';
import { cn } from '@/lib/utils';

const menuItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: <FaHome className="h-5 w-5" /> },
  { href: '/admin/vehicles', label: 'Vehicles', icon: <FaCar className="h-5 w-5" /> },
  { href: '/admin/users', label: 'Users', icon: <FaUsers className="h-5 w-5" /> },
  { href: '/admin/bookings', label: 'Bookings', icon: <FaBookmark className="h-5 w-5" /> },
  { href: '/admin/email-logs', label: 'Email Logs', icon: <FaEnvelope className="h-5 w-5" /> },
  { href: '/admin/whatsapp-logs', label: 'WhatsApp Logs', icon: <FaWhatsapp className="h-5 w-5" /> },
  { href: '/admin/cleanup', label: 'Clean Up Data', icon: <FaTrash className="h-5 w-5" /> },
];

function MainContent({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar();
  const pathname = usePathname();
  return (
    <main className={cn(
      "min-h-screen bg-gray-100 transition-all duration-300",
      "pt-[56px] md:pt-0", // Add padding top for mobile header
      "md:pl-[60px]", // Collapsed sidebar width
      open && "md:pl-[300px]" // Expanded sidebar width
    )}>
      <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl text-gray-900">
            {menuItems.find(item => item.href === pathname)?.label || 'Dashboard'}
          </h1>
        </div>
        {children}
      </div>
    </main>
  );
}

function AdminDashboard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const handleSignOut = () => {
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <SidebarProvider>
        <Sidebar>
          <SidebarBody>
            <div className="flex flex-col h-full">
              <div className="h-16 flex items-center px-4 border-b border-gray-200">
                <div className="relative h-12 w-44">
                  <Image
                    src="/logo.png"
                    alt="OnnRides Admin"
                    fill
                    className="object-contain"
                    priority
                    sizes="(max-width: 768px) 160px, 120px"
                  />
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto py-4">
                {menuItems.map((item) => (
                  <SidebarLink
                    key={item.href}
                    link={item}
                    className={cn(
                      "px-4 py-3 text-sm",
                      pathname === item.href 
                        ? 'text-[#f26e24] bg-orange-50' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-[#f26e24]'
                    )}
                  />
                ))}
              </nav>

              <div className="border-t border-gray-200 p-4">
                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#f26e24] hover:bg-orange-50 rounded-md transition-colors font-goodtimes"
                >
                  <FaSignOutAlt className="h-5 w-5 mr-3" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </SidebarBody>
        </Sidebar>

        <MainContent>
          {children}
        </MainContent>
      </SidebarProvider>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/admin/login') {
      setIsChecking(false);
      return;
    }

    const checkAuth = async () => {
      if (status === 'loading') return;

      if (status === 'unauthenticated') {
        router.replace('/admin/login');
        return;
      }

      if (status === 'authenticated' && session?.user?.role !== 'admin') {
        router.replace('/');
        return;
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [status, session, router, pathname]);

  // Show loading state while checking session
  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f26e24] border-t-transparent"></div>
      </div>
    );
  }

  // Skip layout for login page
  if (pathname === '/admin/login') {
    return children;
  }

  // Don't render anything while redirecting
  if (status === 'unauthenticated' || (status === 'authenticated' && session?.user?.role !== 'admin')) {
    return null;
  }

  return <AdminDashboard>{children}</AdminDashboard>;
} 