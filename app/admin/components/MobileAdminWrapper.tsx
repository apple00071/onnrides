'use client';

import { useState, useEffect } from 'react';
import useIsMobile from '../hooks/useIsMobile';
import { FaHome, FaList, FaUsers, FaCar, FaSignOutAlt, FaCog, FaBell, FaUserCircle } from 'react-icons/fa';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

interface MobileAdminWrapperProps {
  children: React.ReactNode;
}

// Helper function to get the current section name from pathname
const getSectionName = (pathname: string): string => {
  if (pathname === '/admin/dashboard') return 'Dashboard';
  if (pathname.startsWith('/admin/bookings')) return 'Bookings';
  if (pathname.startsWith('/admin/users')) return 'Users';
  if (pathname.startsWith('/admin/vehicles')) return 'Vehicles';
  if (pathname.startsWith('/admin/settings')) return 'Settings';
  
  // Extract the last segment of the path
  const segments = pathname.split('/');
  const lastSegment = segments[segments.length - 1];
  
  // Convert to title case
  return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
};

export default function MobileAdminWrapper({ children }: MobileAdminWrapperProps) {
  const { isMobile, isPWA, isMobilePWA } = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [hasNotifications, setHasNotifications] = useState(false); // Placeholder for notification status
  
  // Get the current section name for header
  const sectionName = getSectionName(pathname || '');

  // Handle scroll to hide/show header
  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show header when scrolling up, hide when scrolling down
      if (currentScrollY > lastScrollY && showHeader && currentScrollY > 50) {
        setShowHeader(false);
      } else if (currentScrollY < lastScrollY && !showHeader) {
        setShowHeader(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, lastScrollY, showHeader]);

  // Mock notification check - replace with real check in production
  useEffect(() => {
    setHasNotifications(Math.random() > 0.5);
  }, []);

  // If not mobile, just render children
  if (!isMobile) {
    return <>{children}</>;
  }

  // Mobile navigation links
  const navLinks = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: <FaHome size={20} /> },
    { name: 'Bookings', href: '/admin/bookings', icon: <FaList size={20} /> },
    { name: 'Users', href: '/admin/users', icon: <FaUsers size={20} /> },
    { name: 'Vehicles', href: '/admin/vehicles', icon: <FaCar size={20} /> },
    { name: 'Settings', href: '/admin/settings', icon: <FaCog size={20} /> },
  ];

  const handleSignOut = () => {
    router.push('/admin-login');
  };

  const handleNotificationsClick = () => {
    // Handle notifications click
    setHasNotifications(false);
  };

  const handleProfileClick = () => {
    // Handle profile click
    router.push('/admin/profile');
  };

  return (
    <div className="flex flex-col min-h-screen relative bg-gray-50">
      {/* Mobile header - hidden on scroll down */}
      <motion.header 
        className="fixed top-0 left-0 right-0 z-20 bg-white dark:bg-gray-900 shadow-md"
        initial={{ y: 0 }}
        animate={{ y: showHeader ? 0 : -64 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between px-4 py-3 h-16">
          <div className="flex items-center">
            <div className="relative overflow-hidden rounded-lg h-9 w-9 flex items-center justify-center bg-orange-100 mr-3">
              <img src="/logo.png" alt="OnnRides" className="h-7 w-auto" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-gray-900 dark:text-white leading-tight">
                {sectionName}
              </span>
              {isPWA && (
                <span className="text-xs text-orange-600 font-medium -mt-0.5">
                  Admin Portal
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleNotificationsClick}
              className="relative p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <FaBell size={18} className="text-gray-700" />
              {hasNotifications && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            
            <button 
              onClick={handleProfileClick}
              className="relative p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <FaUserCircle size={18} className="text-gray-700" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Main content - with padding for header and footer */}
      <main className={`flex-1 pt-16 pb-16 px-4 ${isMobilePWA ? 'pb-24' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {/* Pass through the children */}
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom navigation */}
      <motion.nav 
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-lg border-t border-gray-200 dark:border-gray-800 z-20"
        initial={{ y: 0 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex justify-around">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center py-3 flex-1 relative ${
                  isActive 
                    ? 'text-orange-500 dark:text-orange-400 font-medium' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.1 }}
                >
                  <span>{link.icon}</span>
                </motion.div>
                <span className="text-xs mt-1">{link.name}</span>
                {isActive && (
                  <motion.div 
                    className="absolute -bottom-0 left-0 right-0 h-1 bg-orange-500 dark:bg-orange-400 rounded-t-full"
                    layoutId="activeTab"
                    transition={{ type: "spring", duration: 0.5 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </motion.nav>

      {/* Extra bottom padding for home bar on iOS PWA */}
      {isMobilePWA && (
        <div className="fixed bottom-0 left-0 right-0 h-8 bg-white dark:bg-gray-900 z-10 border-t border-gray-200 dark:border-gray-800"></div>
      )}
    </div>
  );
} 