'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { SidebarProvider, useSidebar } from './SidebarProvider';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, UserCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession, signOut } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import ErrorBoundary from '@/components/ErrorBoundary';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const { isOpen, isMobile, isHovered } = useSidebar();
    const pathname = usePathname();
    const router = useRouter();
    const { data: session } = useSession();

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

    // Get current page name from path
    const getPageName = () => {
        // Static mapping for specific paths
        const path = pathname;
        if (path.includes('/vehicle-returns/new')) return 'Vehicle Return';
        if (path.includes('/vehicle-returns')) return 'Vehicle Returns';
        if (path.includes('/bookings') && path.split('/').length > 3) return 'Booking Details'; // /admin/bookings/[id]
        if (path.includes('/bookings')) return 'Bookings';
        if (path.includes('/users')) return 'Users';
        if (path.includes('/verify/')) return 'Verify Document';

        const parts = pathname.split('/').filter(Boolean);
        if (parts.length <= 1) return 'Dashboard';

        // Fallback to last segment title-cased
        const lastPart = parts[parts.length - 1];
        // If last part is an ID (UUID or short code), use the part before it
        if ((lastPart.length > 20 || lastPart.match(/^[A-Z0-9]{5,}$/)) && parts.length > 2) {
            const parentPart = parts[parts.length - 2];
            return parentPart.charAt(0).toUpperCase() + parentPart.slice(1).replace(/-/g, ' ').replace(/s$/, '') + ' Details';
        }

        return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, ' ');
    };

    return (
        <div className="flex min-h-screen bg-slate-50/60 font-sans">
            <Sidebar />

            <div className={cn(
                "flex flex-1 flex-col transition-all duration-200",
                isMobile ? "pt-12" : (isOpen || isHovered ? "md:ml-[220px]" : "md:ml-[70px]")
            )}>
                {/* Desktop Header */}
                <header className="hidden md:flex h-12 items-center justify-between border-b border-gray-200/40 bg-white/80 backdrop-blur-md px-5 sticky top-0 z-30 shadow-[0_2px_15px_rgba(0,0,0,0.015)]">
                    <h1 className="text-base font-extrabold tracking-tight text-slate-800">
                        {getPageName()}
                    </h1>

                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-[#f26e24] hover:bg-slate-100/50 rounded-xl transition-all duration-150">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-gradient-to-r from-[#f26e24] to-[#ff8c42] rounded-full border border-white" />
                        </Button>

                        <div className="flex items-center gap-3 pl-4 border-l border-gray-200/80">
                            <div className="text-right">
                                <p className="text-sm font-bold text-slate-800 leading-none">
                                    {session?.user?.name || 'Admin'}
                                </p>
                                <p className="text-[10px] font-black uppercase text-[#f26e24] tracking-wider mt-1.5 leading-none">
                                    Administrator
                                </p>
                            </div>
                            <UserCircle className="h-8 w-8 text-slate-400/80" />
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSignOut}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-150 ml-1"
                            title="Sign out"
                        >
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </header>

                {/* Mobile Title (Optional, since Sidebar already has mobile header) */}

                <main className="flex-1 p-3 md:p-4">
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </main>
            </div>
        </div>
    );
}

export default function UnifiedAdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <AdminLayoutContent>
                {children}
            </AdminLayoutContent>
        </SidebarProvider>
    );
}
