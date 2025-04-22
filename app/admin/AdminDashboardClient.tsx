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
import { Menu } from 'lucide-react';
import { useSidebar } from '@/hooks/use-sidebar';

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
  { href: '/admin/dashboard', label: 'Dashboard', icon: <FaHome className="h-5 w-5" /> },
  { href: '/admin/vehicles', label: 'Vehicles', icon: <FaCar className="h-5 w-5" /> },
  { href: '/admin/users', label: 'Users', icon: <FaUsers className="h-5 w-5" /> },
  { href: '/admin/bookings', label: 'Bookings', icon: <FaBookmark className="h-5 w-5" /> },
  { href: '/admin/trip-initiation', label: 'Trip Initiation', icon: <FaQrcode className="h-5 w-5" /> },
  { href: '/admin/coupons', label: 'Coupons', icon: <FaTicketAlt className="h-5 w-5" /> },
  { href: '/admin/email-logs', label: 'Email Logs', icon: <FaEnvelope className="h-5 w-5" /> },
  { href: '/admin/whatsapp-logs', label: 'WhatsApp Logs', icon: <FaWhatsapp className="h-5 w-5" /> },
  { href: '/admin/cleanup', label: 'Clean Up Data', icon: <FaTrash className="h-5 w-5" /> },
  { href: '/admin/settings', label: 'Settings', icon: <FaCog className="h-5 w-5" /> },
];

// Main content component that responds to sidebar state
function MainContent({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar();
  
  return (
    <main className={cn(
      "flex-1 overflow-y-auto bg-gray-50 transition-all duration-300 ease-in-out",
      isOpen ? "md:ml-64" : "md:ml-20"
    )}>
      <div className="container mx-auto px-4 py-8 min-h-screen">
        <div className="bg-white rounded-lg shadow-sm">
          {children}
        </div>
      </div>
    </main>
  );
}

// Mobile header with toggle button
function MobileHeader() {
  const { toggle } = useSidebar();
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={toggle}
      >
        <Menu className="h-6 w-6" />
        <span className="sr-only">Toggle menu</span>
      </Button>
      <div className="flex-1">
        <Link href="/admin/dashboard" className="flex items-center space-x-2">
          <span className="font-bold">Admin Dashboard</span>
        </Link>
      </div>
      <SignOutButton mobileView />
    </header>
  );
}

// Sign out button component that uses the sidebar context
function SignOutButton({ mobileView = false }: { mobileView?: boolean }) {
  const { data: session } = useSession();

  const handleSignOut = () => {
    // Your existing sign out logic
  };

  if (mobileView) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSignOut}
        className="h-9 w-9"
      >
        <FaSignOutAlt className="h-4 w-4" />
        <span className="sr-only">Sign out</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={handleSignOut}
      className="w-full justify-start gap-2"
    >
      <FaSignOutAlt className="h-4 w-4" />
      <span>Sign out</span>
    </Button>
  );
}

export default function AdminDashboardClient({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { isOpen } = useSidebar();

  return (
    <div className="relative flex min-h-screen">
      {/* Desktop Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 z-40 h-screen w-64 -translate-x-full border-r bg-background transition-transform md:translate-x-0",
        isOpen ? "w-64" : "w-20",
        "hidden md:block" // Hide on mobile
      )}>
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-4 py-4">
            <Link href="/admin/dashboard" className="flex items-center space-x-2">
              {isOpen ? (
                <>
                  <Image
                    src="/logo.png"
                    alt="ONNRIDES"
                    width={32}
                    height={32}
                    className="h-8 w-auto"
                  />
                  <span className="font-bold text-[#f26e24]">ONNRIDES</span>
                </>
              ) : (
                <Image
                  src="/logo.png"
                  alt="ON"
                  width={32}
                  height={32}
                  className="h-8 w-auto"
                />
              )}
            </Link>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:bg-accent focus:text-accent-foreground focus:outline-none"
                )}
              >
                {item.icon}
                {isOpen && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
          <div className="border-t p-4">
            <SignOutButton />
          </div>
        </div>
      </div>

      {/* Mobile Header and Content */}
      <div className="flex flex-1 flex-col">
        <MobileHeader />
        <MainContent>{children}</MainContent>
      </div>

      {/* Mobile Sidebar (Drawer) */}
      {isMobile && (
        <div
          className={cn(
            "fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          <nav className="relative h-full w-3/4 max-w-sm bg-background shadow-xl">
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center px-4">
                <Link href="/admin/dashboard" className="flex items-center space-x-2">
                  <span className="font-bold">ONNRIDES Admin</span>
                </Link>
              </div>
              <div className="flex-1 overflow-y-auto py-4">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
              <div className="border-t p-4">
                <SignOutButton />
              </div>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
} 