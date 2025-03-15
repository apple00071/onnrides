'use client';

import { useState, useEffect } from 'react';
import useIsMobile from '../hooks/useIsMobile';
import { FaHome, FaList, FaUsers, FaCar, FaSignOutAlt, FaCog } from 'react-icons/fa';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileAdminWrapperProps {
  children: React.ReactNode;
}

export default function MobileAdminWrapper({ children }: MobileAdminWrapperProps) {
  const { isMobile, isPWA, isMobilePWA } = useIsMobile();
  const pathname = usePathname();
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Handle scroll to hide/show header
  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show header when scrolling up, hide when scrolling down
      if (currentScrollY > lastScrollY && showHeader && currentScrollY > 80) {
        setShowHeader(false);
      } else if (currentScrollY < lastScrollY && !showHeader) {
        setShowHeader(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, lastScrollY, showHeader]);

  // If not mobile or not a PWA, just render children
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

  return (
    <div className="flex flex-col min-h-screen relative">
      {/* Mobile header - hidden on scroll down */}
      <header 
        className={`fixed top-0 left-0 right-0 z-10 bg-white dark:bg-gray-900 shadow transform transition-transform duration-300 ${
          showHeader ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-2 h-14">
          <div className="flex items-center">
            <img src="/logo.png" alt="OnnRides" className="h-8 w-auto" />
            <span className="ml-2 font-semibold text-lg">Admin</span>
          </div>
          {isPWA && (
            <div className="px-2 py-1 text-xs bg-orange-500 text-white rounded-full">
              PWA
            </div>
          )}
        </div>
      </header>

      {/* Main content - with padding for header and footer */}
      <main className={`flex-1 pt-14 pb-16 ${isMobilePWA ? 'pb-20' : ''}`}>
        {/* Pass through the children */}
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-lg border-t border-gray-200 dark:border-gray-800 z-10">
        <div className="flex justify-around">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center p-2 flex-1 ${
                  isActive 
                    ? 'text-orange-500 dark:text-orange-400 font-medium' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <span>{link.icon}</span>
                <span className="text-xs mt-1">{link.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Extra bottom padding for home bar on iOS PWA */}
      {isMobilePWA && (
        <div className="fixed bottom-0 left-0 right-0 h-6 bg-white dark:bg-gray-900 z-10"></div>
      )}
    </div>
  );
} 