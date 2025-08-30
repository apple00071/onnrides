'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { FaHome, FaCar, FaUsers, FaBookmark, FaEnvelope, FaWhatsapp, FaQrcode, FaTrash, FaSignOutAlt, FaTicketAlt, FaCog } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { toast } from 'react-hot-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import ErrorBoundary from '@/components/ErrorBoundary';

const menuItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: <FaHome className="h-4 w-4" /> },
  { href: '/admin/vehicles', label: 'Vehicles', icon: <FaCar className="h-4 w-4" /> },
  { href: '/admin/users', label: 'Users', icon: <FaUsers className="h-4 w-4" /> },
  { href: '/admin/bookings', label: 'Bookings', icon: <FaBookmark className="h-4 w-4" /> },
  { href: '/admin/vehicle-returns', label: 'Vehicle Returns', icon: <FaCar className="h-4 w-4" /> },
  { href: '/admin/trip-initiation', label: 'Trip Initiation', icon: <FaQrcode className="h-4 w-4" /> },
  { href: '/admin/coupons', label: 'Coupons', icon: <FaTicketAlt className="h-4 w-4" /> },
  { href: '/admin/email-logs', label: 'Email Logs', icon: <FaEnvelope className="h-4 w-4" /> },
  { href: '/admin/whatsapp-logs', label: 'WhatsApp Logs', icon: <FaWhatsapp className="h-4 w-4" /> },
  { href: '/admin/cleanup', label: 'Clean Up Data', icon: <FaTrash className="h-4 w-4" /> },
  { href: '/admin/settings', label: 'Settings', icon: <FaCog className="h-4 w-4" /> },
];

export default function AdminDashboardClient({ children }: { children: React.ReactNode }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Authentication check effect
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin-login?callbackUrl=/admin/dashboard');
    }
  }, [status, router]);

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
      toast.success('Successfully signed out');
      router.push('/admin-login');
    } catch (error) {
      toast.error('Failed to sign out');
      console.error('Sign out error:', error);
    }
  };

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#f26e24]"></div>
      </div>
    );
  }

  const isCollapsed = !isHovered && !isMobile;

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div 
          onMouseEnter={() => !isMobile && setIsHovered(true)}
          onMouseLeave={() => !isMobile && setIsHovered(false)}
          className={cn(
            "fixed inset-y-0 left-0 z-40 bg-[#f26e24] transition-all duration-300",
            isCollapsed ? "w-16" : "w-64",
            isMobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}
        >
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center justify-center border-b border-[#e05d13] px-4">
              <Link href="/admin/dashboard" className="flex items-center">
                <Logo className="h-8 w-8 text-white" />
                {!isCollapsed && (
                  <span className="ml-3 font-bold text-white">ADMIN</span>
                )}
              </Link>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1">
              <nav className="px-2 py-4">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileNavOpen(false)}
                    className={cn(
                      "flex items-center px-3 py-2 my-1 rounded-md transition-colors",
                      pathname === item.href ? "bg-[#e05d13] text-white" : "text-white hover:bg-[#e05d13]",
                      isCollapsed ? "justify-center w-10 mx-auto" : "justify-start w-full"
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div className={cn(
                      "flex items-center",
                      isCollapsed ? "justify-center" : "justify-start w-full"
                    )}>
                      {item.icon}
                      {!isCollapsed && <span className="ml-3">{item.label}</span>}
                    </div>
                  </Link>
                ))}
              </nav>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t border-[#e05d13] p-4">
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className={cn(
                  "w-full text-white hover:bg-[#e05d13]",
                  isCollapsed ? "justify-center w-10 mx-auto px-0" : "justify-start w-full px-3"
                )}
                title={isCollapsed ? "Sign out" : undefined}
              >
                <div className={cn(
                  "flex items-center",
                  isCollapsed ? "justify-center" : "justify-start w-full"
                )}>
                  <FaSignOutAlt className="h-4 w-4" />
                  {!isCollapsed && <span className="ml-3">Sign out</span>}
                </div>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="fixed top-4 left-4 z-50 rounded-md bg-[#f26e24] p-2 text-white md:hidden"
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Main Content */}
        <div className={cn(
          "flex-1 transition-all duration-300",
          isCollapsed ? "md:ml-16" : "md:ml-64"
        )}>
          <main className="min-h-screen bg-gray-50 p-4 md:p-8">
            {children}
          </main>
        </div>

        {/* Mobile Nav Backdrop */}
        {isMobileNavOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setIsMobileNavOpen(false)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
} 