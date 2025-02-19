'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { FaHome, FaCar, FaUsers, FaBookmark, FaBars, FaTimes, FaTrash, FaEnvelope, FaWhatsapp, FaQrcode } from 'react-icons/fa';
import { Sidebar, SidebarBody, SidebarLink, useSidebar, SidebarProvider } from '@/components/admin/Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

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
      className="min-h-screen bg-gray-100 transition-all duration-300 lg:pl-[300px]"
      animate={{
        paddingLeft: animate ? (open ? "300px" : "60px") : "300px",
        paddingTop: "56px",
      }}
    >
      <div className="p-3 sm:p-4 lg:p-8">
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
        {/* Mobile Header */}
        <div className="fixed top-0 left-0 right-0 h-14 bg-white shadow-sm z-40 flex items-center justify-between px-4 lg:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <FaTimes className="h-5 w-5 text-gray-600" />
            ) : (
              <FaBars className="h-5 w-5 text-gray-600" />
            )}
          </button>
          <h1 className="text-lg font-semibold text-[#f26e24]">ONNRIDES ADMIN</h1>
          <div className="w-10" />
        </div>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 transform ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-300 ease-in-out z-50 lg:z-30 w-[280px] bg-white shadow-lg`}>
          <div className="flex flex-col h-full">
            {/* Logo - Hidden on mobile when menu is closed */}
            <div className="h-14 flex items-center px-4 border-b border-gray-200 lg:flex">
              <span className="text-xl font-semibold text-[#f26e24]">ONNRIDES ADMIN</span>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4">
              <Sidebar>
                <SidebarBody>
                  {menuItems.map((item) => (
                    <SidebarLink
                      key={item.href}
                      link={{
                        href: item.href,
                        label: item.label,
                        icon: item.icon
                      }}
                      className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                        pathname === item.href 
                          ? 'text-[#f26e24] bg-orange-50' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-[#f26e24]'
                      }`}
                      props={{
                        onClick: () => setIsMobileMenuOpen(false)
                      }}
                    />
                  ))}
                </SidebarBody>
              </Sidebar>
            </div>

            {/* Mobile Footer */}
            <div className="border-t border-gray-200 p-4 lg:hidden">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  // Add your logout logic here
                }}
                className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#f26e24] hover:bg-orange-50 rounded-md transition-colors"
              >
                <FaTrash className="h-5 w-5 mr-3" />
                Sign Out
              </button>
            </div>
          </div>
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