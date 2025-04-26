'use client';

import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FaHome, FaCar, FaUsers, FaBookmark, FaEnvelope, FaWhatsapp, FaQrcode, FaTrash, FaSignOutAlt, FaTicketAlt, FaCog } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Menu, AlertCircle } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { toast } from 'react-hot-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Hook to detect if the device is mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// Dynamically import the AdminPWA component with no SSR and with key
const AdminPWA = dynamic(() => import('./components/AdminPWA'), { 
  ssr: false,
  loading: () => null
});

const menuItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: <FaHome className="h-4 w-4" /> },
  { href: '/admin/vehicles', label: 'Vehicles', icon: <FaCar className="h-4 w-4" /> },
  { href: '/admin/users', label: 'Users', icon: <FaUsers className="h-4 w-4" /> },
  { href: '/admin/bookings', label: 'Bookings', icon: <FaBookmark className="h-4 w-4" /> },
  { href: '/admin/trip-initiation', label: 'Trip Initiation', icon: <FaQrcode className="h-4 w-4" /> },
  { href: '/admin/coupons', label: 'Coupons', icon: <FaTicketAlt className="h-4 w-4" /> },
  { href: '/admin/email-logs', label: 'Email Logs', icon: <FaEnvelope className="h-4 w-4" /> },
  { href: '/admin/whatsapp-logs', label: 'WhatsApp Logs', icon: <FaWhatsapp className="h-4 w-4" /> },
  { href: '/admin/cleanup', label: 'Clean Up Data', icon: <FaTrash className="h-4 w-4" /> },
  { href: '/admin/settings', label: 'Settings', icon: <FaCog className="h-4 w-4" /> },
];

// Animation variants for the sidebar
const sidebarVariants = {
  open: {
    width: "15rem",
  },
  closed: {
    width: "3.05rem",
  },
};

const contentVariants = {
  open: { display: "block", opacity: 1 },
  closed: { display: "block", opacity: 1 },
};

const variants = {
  open: {
    x: 0,
    opacity: 1,
    transition: {
      x: { stiffness: 1000, velocity: -100 },
    },
  },
  closed: {
    x: -20,
    opacity: 0,
    transition: {
      x: { stiffness: 100 },
    },
  },
};

const transitionProps = {
  type: "tween",
  ease: "easeOut",
  duration: 0.2,
  staggerChildren: 0.1,
};

const staggerVariants = {
  open: {
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

// Mobile header with toggle button
function MobileHeader() {
  const router = useRouter();
  
  const handleSignOut = async () => {
    toast.success('Successfully signed out');
    window.location.href = '/admin-login';
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:hidden">
      <div className="flex-1">
        <Link href="/admin/dashboard" className="flex items-center space-x-2">
          <Logo className="h-8 w-auto mr-2" />
          <span className="font-bold">OnnRides Admin</span>
        </Link>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSignOut}
        className="h-9 w-9"
      >
        <FaSignOutAlt className="h-4 w-4" />
        <span className="sr-only">Sign out</span>
      </Button>
    </header>
  );
}

export default function AdminDashboardClient({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAdminMissing, setIsAdminMissing] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Check if admin account exists
  useEffect(() => {
    const checkAdminAccount = async () => {
      try {
        const response = await fetch('/api/auth/verify-admin', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          setIsAdminMissing(true);
        }
      } catch (error) {
        console.error('Error checking admin account:', error);
        setIsAdminMissing(true);
      }
    };
    
    checkAdminAccount();
  }, []);

  const handleSignOut = async () => {
    toast.success('Successfully signed out');
    window.location.href = '/admin-login';
  };

  // Return mobile layout if on mobile device
  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen">
        <MobileHeader />
        <div className="flex-1 bg-gray-50 overflow-auto">
          <div className="container mx-auto p-4">
            <div className="bg-white rounded-lg shadow-sm min-h-[calc(100vh-6rem)]">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout with animated sidebar
  return (
    <div className="flex min-h-screen">
      <motion.div
        className="sidebar fixed left-0 z-40 h-full shrink-0 border-r bg-[#f26e24]"
        initial={isCollapsed ? "closed" : "open"}
        animate={isCollapsed ? "closed" : "open"}
        variants={sidebarVariants}
        transition={transitionProps}
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
      >
        <motion.div
          className="relative z-40 flex h-full text-white shrink-0 flex-col transition-all"
          variants={contentVariants}
        >
          <motion.ul variants={staggerVariants} className="flex h-full flex-col">
            <div className="flex grow flex-col">
              {/* Header with Logo */}
              <div className="flex h-16 w-full shrink-0 items-center justify-center border-b border-[#e05d13]">
                <Link href="/admin/dashboard" className={cn(
                  "flex items-center", 
                  isCollapsed ? "justify-center" : "justify-start w-full gap-3 px-4"
                )}>
                  {/* Fixed size logo container that doesn't change with sidebar state */}
                  <div className="w-[32px] h-[32px] flex items-center justify-center bg-[#f26e24] rounded-sm">
                    <Logo className="h-full w-full p-0.5" />
                  </div>
                  
                  {/* Only show text when sidebar is open */}
                  {!isCollapsed && (
                    <span className="font-bold text-xl text-white">ADMIN</span>
                  )}
                </Link>
              </div>

              {/* Admin Missing Warning */}
              {isAdminMissing && (
                <div className="bg-red-600 text-white p-3 mx-3 mt-3 rounded-md shadow-sm flex items-center text-sm">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <motion.div variants={variants}>
                    {!isCollapsed && (
                      <span className="font-bold">Admin account missing</span>
                    )}
                  </motion.div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex grow flex-col">
                <ScrollArea className="h-[calc(100vh-8rem)] grow p-2">
                  <div className="flex w-full flex-col gap-1">
                    {menuItems.map((item, index) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex h-9 w-full flex-row items-center rounded-md px-2 py-1.5 transition-colors",
                          pathname === item.href
                            ? "bg-[#e05d13] text-white font-medium"
                            : "text-white hover:bg-[#e05d13]",
                          isCollapsed && "justify-center"
                        )}
                      >
                        <div className={cn(
                          "flex items-center justify-center",
                          isCollapsed ? "w-full" : "w-6"
                        )}>
                          {item.icon}
                        </div>
                        <motion.li variants={variants}>
                          {!isCollapsed && (
                            <p className="ml-2 text-sm font-medium">{item.label}</p>
                          )}
                        </motion.li>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Footer */}
              <div className="border-t border-[#e05d13] p-3">
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className={cn(
                    "w-full gap-2 text-white hover:bg-[#e05d13]",
                    isCollapsed ? "justify-center" : "justify-start"
                  )}
                >
                  <FaSignOutAlt className="h-4 w-4" />
                  <motion.span variants={variants}>
                    {!isCollapsed && "Sign out"}
                  </motion.span>
                </Button>
              </div>
            </div>
          </motion.ul>
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 ml-[3.05rem] transition-all duration-300">
        <div className="sticky top-0 z-30 h-16 border-b bg-background px-6 flex items-center">
          {/* Removed the OnnRides Admin Dashboard text as requested */}
        </div>
        <div className="flex-1 overflow-auto bg-gray-50 p-4">
          <div className="container mx-auto">
            <div className="bg-white rounded-lg shadow-sm min-h-[calc(100vh-6rem)] p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 