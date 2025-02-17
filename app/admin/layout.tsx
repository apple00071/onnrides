'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { FaHome, FaCar, FaUsers, FaBookmark, FaBars, FaTimes, FaTrash, FaEnvelope, FaWhatsapp, FaQrcode } from 'react-icons/fa';
import { Sidebar, SidebarBody, SidebarLink, useSidebar, SidebarProvider } from '@/components/admin/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';

const menuItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: <FaHome className="h-5 w-5" /> },
  { href: '/admin/vehicles', label: 'Vehicles', icon: <FaCar className="h-5 w-5" /> },
  { href: '/admin/users', label: 'Users', icon: <FaUsers className="h-5 w-5" /> },
  { href: '/admin/bookings', label: 'Bookings', icon: <FaBookmark className="h-5 w-5" /> },
  { href: '/admin/email-logs', label: 'Email Logs', icon: <FaEnvelope className="h-5 w-5" /> },
  { href: '/admin/whatsapp-logs', label: 'WhatsApp Logs', icon: <FaWhatsapp className="h-5 w-5" /> },
  { href: '/admin/whatsapp-setup', label: 'WhatsApp Setup', icon: <FaQrcode className="h-5 w-5" /> },
  { href: '/admin/cleanup', label: 'Clean Up Data', icon: <FaTrash className="h-5 w-5" /> },
];

function MainContent({ children }: { children: React.ReactNode }) {
  const { open, animate } = useSidebar();
  
  return (
    <motion.main
      className="min-h-screen bg-gray-100 transition-all duration-300 md:pl-[300px]"
      animate={{
        paddingLeft: animate ? (open ? "300px" : "60px") : "300px",
        paddingTop: "0px",
      }}
    >
      <div className="p-4 md:p-8">
        {children}
      </div>
    </motion.main>
  );
}

function AdminDashboard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-100">
        {/* Mobile Menu Button */}
        <div className="fixed top-4 left-4 z-50 md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 bg-white rounded-lg shadow-md"
          >
            {isMobileMenuOpen ? (
              <FaTimes className="h-6 w-6 text-gray-600" />
            ) : (
              <FaBars className="h-6 w-6 text-gray-600" />
            )}
          </button>
        </div>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 transform ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out z-50 md:z-30`}>
          <Sidebar>
            <SidebarBody>
              {menuItems.map((item) => (
                <SidebarLink
                  key={item.href}
                  link={item}
                  className={pathname === item.href ? 'text-[#f26e24]' : 'text-gray-600'}
                  props={{
                    href: item.href,
                    onClick: () => setIsMobileMenuOpen(false)
                  }}
                />
              ))}
            </SidebarBody>
          </Sidebar>
        </div>

        <MainContent>
          {children}
        </MainContent>
      </div>
    </SidebarProvider>
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