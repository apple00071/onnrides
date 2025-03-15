'use client';

import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { FaHome, FaCar, FaUsers, FaBookmark, FaEnvelope, FaWhatsapp, FaQrcode, FaTrash, FaSignOutAlt, FaTicketAlt, FaCog } from 'react-icons/fa';
import { Sidebar, SidebarBody, SidebarLink, useSidebar, SidebarProvider } from '@/components/admin/Sidebar';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Dynamically import the AdminPWA component with no SSR and with key
const AdminPWA = dynamic(() => import('./components/AdminPWA'), { 
  ssr: false,
  loading: () => null
});

// Dynamically import the mobile wrapper with no SSR to avoid hydration issues
const MobileAdminWrapper = dynamic(
  () => import('./components/MobileAdminWrapper'),
  { ssr: false }
);

const menuItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: <FaHome className="h-5 w-5" /> },
  { href: '/admin/vehicles', label: 'Vehicles', icon: <FaCar className="h-5 w-5" /> },
  { href: '/admin/users', label: 'Users', icon: <FaUsers className="h-5 w-5" /> },
  { href: '/admin/bookings', label: 'Bookings', icon: <FaBookmark className="h-5 w-5" /> },
  { href: '/admin/coupons', label: 'Coupons', icon: <FaTicketAlt className="h-5 w-5" /> },
  { href: '/admin/email-logs', label: 'Email Logs', icon: <FaEnvelope className="h-5 w-5" /> },
  { href: '/admin/whatsapp-logs', label: 'WhatsApp Logs', icon: <FaWhatsapp className="h-5 w-5" /> },
  { href: '/admin/cleanup', label: 'Clean Up Data', icon: <FaTrash className="h-5 w-5" /> },
  { href: '/admin/settings', label: 'Settings', icon: <FaCog className="h-5 w-5" /> },
];

// Main content component that responds to sidebar state
function MainContent({ children }: { children: React.ReactNode }) {
  const { open } = useSidebar();
  const pathname = usePathname();
  
  return (
    <main 
      className={cn(
        "min-h-screen bg-gray-50 transition-all duration-300 w-full overflow-y-auto",
        "pt-[60px]", // Padding for mobile header
        open 
          ? "md:pl-[300px]" // Expanded sidebar width
          : "md:pl-[60px]"  // Collapsed sidebar width
      )}
    >
      <div className="p-2 sm:p-4 md:p-6 w-full h-auto max-w-none">
        <div className="mb-4 md:mb-6 w-full">
          <h1 className="text-xl sm:text-2xl text-gray-900 font-semibold">
            {menuItems.find(item => item.href === pathname)?.label || 'Dashboard'}
          </h1>
        </div>
        {children}
      </div>
    </main>
  );
}

// Mobile header with toggle button
function MobileHeader() {
  const { open, setOpen } = useSidebar();
  
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 md:hidden">
      <div className="flex items-center justify-between h-full px-2">
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="relative h-10 w-32">
          <Image
            src="/logo.png"
            alt="OnnRides Admin"
            fill
            className="object-contain"
            priority
            sizes="(max-width: 768px) 128px, 120px"
          />
        </div>
        <div className="w-10" /> {/* Spacer for alignment */}
      </div>
    </header>
  );
}

// Sign out button component that uses the sidebar context
function SignOutButton() {
  const router = useRouter();
  const { open } = useSidebar();
  
  const handleSignOut = () => {
    router.push('/admin-login');
  };
  
  return (
    <button
      onClick={handleSignOut}
      className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-600 hover:text-[#f26e24] hover:bg-orange-50 rounded-md transition-colors"
    >
      <FaSignOutAlt className="h-5 w-5 mr-3" />
      <motion.span
        animate={{
          display: open ? "inline-block" : "none",
          opacity: open ? 1 : 0,
        }}
        className="uppercase tracking-wider whitespace-pre"
      >
        Sign Out
      </motion.span>
    </button>
  );
}

export default function AdminDashboardClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Only render client components after mounting to prevent hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-gray-100"></div>;
  }

  return (
    <MobileAdminWrapper>
      <div className="flex h-screen bg-white dark:bg-gray-900 overflow-hidden">
        <SidebarProvider open={sidebarOpen} setOpen={setSidebarOpen} animate={true}>
          {/* Mobile Header */}
          <MobileHeader />

          <Sidebar>
            <SidebarBody>
              <div className="flex flex-col h-full">
                {/* Desktop Logo */}
                <div className="hidden md:flex h-16 items-center px-4 border-b border-gray-200">
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
                  <SignOutButton />
                </div>
              </div>
            </SidebarBody>
          </Sidebar>

          {/* Main Content with responsive padding */}
          <MainContent>
            {children}
          </MainContent>

          {/* PWA Install Prompt */}
          {mounted && <AdminPWA key="admin-pwa" />}
        </SidebarProvider>
      </div>
    </MobileAdminWrapper>
  );
} 