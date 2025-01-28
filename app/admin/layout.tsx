'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FaHome, FaCar, FaUsers, FaBookmark } from 'react-icons/fa';
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from '@/components/admin/Sidebar';
import { motion } from 'framer-motion';

const menuItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: <FaHome className="h-5 w-5" /> },
  { href: '/admin/vehicles', label: 'Vehicles', icon: <FaCar className="h-5 w-5" /> },
  { href: '/admin/users', label: 'Users', icon: <FaUsers className="h-5 w-5" /> },
  { href: '/admin/bookings', label: 'Bookings', icon: <FaBookmark className="h-5 w-5" /> },
];

function MainContent({ children }: { children: React.ReactNode }) {
  const { open, animate } = useSidebar();
  
  return (
    <motion.main
      className="min-h-screen bg-gray-100 transition-all duration-300"
      animate={{
        paddingLeft: animate ? (open ? "300px" : "60px") : "300px",
        paddingTop: "0px",
      }}
    >
      <div className="p-8">
        {children}
      </div>
    </motion.main>
  );
}

function AdminDashboard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar>
        <SidebarBody>
          {menuItems.map((item) => (
            <SidebarLink
              key={item.href}
              link={item}
              className={pathname === item.href ? 'text-[#f26e24]' : 'text-gray-600'}
            />
          ))}
        </SidebarBody>
        <MainContent>
          {children}
        </MainContent>
      </Sidebar>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/admin/login') {
      return;
    }

    // Wait for session to be checked
    if (status === 'loading') {
      return;
    }

    // Redirect if not authenticated or not admin
    if (status === 'unauthenticated') {
      router.replace('/admin/login');
      return;
    }

    if (session?.user && session.user.role !== 'admin') {
      router.replace('/admin/login?error=unauthorized');
      return;
    }
  }, [status, session, router, pathname]);

  // If we're on the login page, just render the children
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f26e24] border-t-transparent"></div>
      </div>
    );
  }

  // Don't render admin UI if not authenticated or not admin
  if (status === 'unauthenticated' || !session?.user || session.user.role !== 'admin') {
    return null;
  }

  return <AdminDashboard>{children}</AdminDashboard>;
} 