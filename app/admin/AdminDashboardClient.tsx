'use client';

import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FaHome, FaCar, FaUsers, FaBookmark, FaEnvelope, FaWhatsapp, FaQrcode, FaTrash, FaSignOutAlt, FaTicketAlt, FaCog } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Menu, X, AlertCircle } from 'lucide-react';
import { useSidebar } from '@/hooks/use-sidebar';
import { Logo } from '@/components/ui/Logo';
import { toast } from 'react-hot-toast';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdminMissing, setIsAdminMissing] = useState(false);
  const pathname = usePathname();

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

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleSignOut = async () => {
    // This would typically use the signOut method from next-auth
    toast.success('Successfully signed out');
    // Redirect to login
    window.location.href = '/admin-login';
  };

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
            {/* Add Recreate Admin link */}
            <Link 
              href="/admin/recreate"
              className="flex items-center mb-4 space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors bg-red-500 text-white hover:bg-red-600"
            >
              <AlertCircle className="h-4 w-4" />
              {isOpen && <span>Recreate Admin</span>}
            </Link>
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

      {/* Mobile sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="p-4 md:hidden fixed top-4 left-4 z-30 bg-white rounded-full shadow-md"
        aria-label="Toggle sidebar"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Backdrop (Mobile) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="fixed inset-0 bg-black z-20 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`fixed md:relative z-30 w-64 h-full bg-[#f26e24] text-white transition-all transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        initial={false}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-20 shadow-md">
            <Link href="/admin/dashboard" className="flex items-center">
              <Logo className="h-9 w-auto" />
              <span className="ml-2 text-xl font-bold">ADMIN</span>
            </Link>
          </div>

          {/* Admin Missing Warning */}
          {isAdminMissing && (
            <div className="bg-red-600 text-white p-3 mx-3 mt-3 rounded-md shadow-sm flex items-center text-sm">
              <AlertCircle className="h-5 w-5 mr-2" />
              <div>
                <Link href="/admin/recreate" className="font-bold underline">
                  Recreate Admin Account
                </Link>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="py-4 flex-grow">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center px-6 py-3 text-sm ${
                        isActive
                          ? 'bg-[#e05d13] font-medium'
                          : 'hover:bg-[#e05d13]'
                      }`}
                      onClick={closeSidebar}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer with Recreate Admin link */}
          <div className="p-4">
            <Link
              href="/admin/recreate"
              className="flex items-center justify-center w-full p-2 mb-4 text-sm bg-white text-[#f26e24] rounded hover:bg-gray-100"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Recreate Admin
            </Link>
            
            <button
              onClick={handleSignOut}
              className="flex items-center px-6 py-3 text-sm w-full hover:bg-[#e05d13]"
            >
              <FaSignOutAlt className="h-5 w-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </motion.aside>
    </div>
  );
} 