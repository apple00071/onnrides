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
    const { isOpen, isMobile } = useSidebar();
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
        const parts = pathname.split('/').filter(Boolean);
        if (parts.length <= 1) return 'Dashboard';
        const lastPart = parts[parts.length - 1];
        return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, ' ');
    };

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            <Sidebar />

            <div className={cn(
                "flex flex-1 flex-col transition-all duration-300",
                isMobile ? "pt-16" : (isOpen ? "md:ml-48" : "md:ml-16")
            )}>
                {/* Desktop Header */}
                <header className="hidden md:flex h-16 items-center justify-between border-b bg-background px-8 sticky top-0 z-30">
                    <h1 className="text-xl font-semibold tracking-tight text-gray-900">
                        {getPageName()}
                    </h1>

                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="text-muted-foreground mr-2">
                            <Bell className="h-5 w-5" />
                        </Button>

                        <div className="flex items-center gap-3 pl-4 border-l">
                            <div className="text-right">
                                <p className="text-sm font-medium leading-none text-gray-900">
                                    {session?.user?.name || 'Admin'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Administrator
                                </p>
                            </div>
                            <UserCircle className="h-8 w-8 text-muted-foreground/50" />
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSignOut}
                            className="text-muted-foreground hover:text-destructive transition-colors ml-2"
                            title="Sign out"
                        >
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </header>

                {/* Mobile Title (Optional, since Sidebar already has mobile header) */}

                <main className="flex-1 p-4 md:p-8">
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
