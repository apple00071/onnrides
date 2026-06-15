"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSidebar } from '@/components/admin/SidebarProvider';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  Car,
  Users,
  CalendarDays,
  Settings,
  LogOut,
  LucideIcon,
  QrCode,
  Ticket,
  Mail,
  MessageSquare,
  ReceiptIndianRupee,
  BarChart3,
  RotateCcw,
  BellRing
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Permission } from '@/lib/database/schema';

interface SidebarLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

const sidebarLinks: SidebarLink[] = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard
  },
  {
    href: '/admin/vehicles',
    label: 'Vehicles',
    icon: Car
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: Users
  },
  {
    href: '/admin/bookings',
    label: 'Bookings',
    icon: CalendarDays
  },
  {
    href: '/admin/payment-reminders',
    label: 'Payment Reminders',
    icon: BellRing
  },

  {
    href: '/admin/vehicle-returns',
    label: 'Vehicle Returns',
    icon: RotateCcw
  },
  {
    href: '/admin/finance',
    label: 'Finance',
    icon: ReceiptIndianRupee
  },
  {
    href: '/admin/reports',
    label: 'Reports',
    icon: BarChart3
  },
  {
    href: '/admin/coupons',
    label: 'Coupons',
    icon: Ticket
  },
  {
    href: '/admin/email-logs',
    label: 'Email Logs',
    icon: Mail
  },
  {
    href: '/admin/whatsapp-logs',
    label: 'WhatsApp Logs',
    icon: MessageSquare
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    icon: Settings
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, toggle, isMobile, isHovered, setIsHovered } = useSidebar();
  const { data: session } = useSession();

  const user = session?.user;
  const isAdmin = user?.role === 'admin';
  const permissions = user?.permissions || {};

  const filteredLinks = sidebarLinks.filter(link => {
    if (isAdmin) return true;

    // Staff Permission Checks
    switch (link.href) {
      case '/admin/dashboard':
        return true; // Everyone sees dashboard
      case '/admin/bookings':
      case '/admin/payment-reminders':
      case '/admin/vehicle-returns':
        return permissions.manage_bookings;
      case '/admin/vehicles':
        return permissions.manage_vehicles;
      case '/admin/users':
        return permissions.manage_users;
      case '/admin/finance':
        return permissions.manage_finance;
      case '/admin/reports':
        return permissions.view_reports;
      case '/admin/settings':
        return permissions.manage_settings;

      // Default Blocked for Staff if not Admin
      case '/admin/email-logs':
      case '/admin/whatsapp-logs':
      case '/admin/coupons':
        return false;

      default:
        return false;
    }
  });

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.div
        initial={false}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
        animate={{
          width: (isOpen || isHovered) ? 220 : 70,
          transition: { duration: 0.2, ease: "easeInOut" }
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-white text-slate-800 border-slate-200/80 shadow-[2px_0_15px_rgba(0,0,0,0.02)]",
          "hidden md:flex"
        )}
      >
        <div className="flex h-12 items-center justify-center px-4 border-b border-slate-100/80">
          <div className={cn(
            "relative h-8 transition-all duration-200 flex items-center justify-center",
            (isOpen || isHovered) ? "w-36" : "w-8"
          )}>
            {(isOpen || isHovered) ? (
              <span className="text-lg font-black tracking-wider text-[#f26e24]">
                MISTER RIDES
              </span>
            ) : (
              <span className="text-xl font-black text-[#f26e24]">M</span>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-hidden py-4">
          <nav className="grid gap-1 px-3">
            {filteredLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 relative overflow-hidden",
                    isActive 
                      ? "text-[#f26e24] bg-slate-50 shadow-sm" 
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/50"
                  )}
                >
                  {/* Left Active border line */}
                  {isActive && (
                    <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#f26e24]" />
                  )}
                  <link.icon className={cn(
                    "h-5 w-5 shrink-0 transition-colors duration-150",
                    isActive ? "text-[#f26e24]" : "text-slate-400 group-hover:text-slate-600"
                  )} />
                  <span className={cn(
                    "whitespace-nowrap transition-all duration-200",
                    (isOpen || isHovered) ? "opacity-100 w-auto" : "opacity-0 w-0 md:hidden"
                  )}>
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
      </motion.div>

      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-12 bg-white border-b border-slate-200 md:hidden z-50 px-4">
        <div className="flex h-full items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="md:hidden text-slate-600 hover:bg-slate-50"
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-sm font-bold text-slate-800">
              {sidebarLinks.find(link => link.href === pathname)?.label || 'Admin'}
            </span>
          </div>
          <span className="text-sm font-black tracking-wider text-[#f26e24]">
            MISTER RIDES
          </span>
        </div>
      </div>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isOpen && isMobile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden backdrop-blur-xs"
              onClick={toggle}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 z-50 w-[240px] bg-white border-r border-slate-200 shadow-2xl md:hidden flex flex-col"
            >
              <div className="flex h-12 items-center justify-between px-4 border-b border-slate-100">
                <span className="text-sm font-black tracking-wider text-[#f26e24]">
                  MISTER RIDES
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggle}
                  className="text-slate-500 hover:text-slate-800"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <ScrollArea className="flex-1 overflow-hidden py-4">
                <nav className="grid gap-1 px-3">
                  {filteredLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={toggle}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all relative overflow-hidden",
                          isActive 
                            ? "text-[#f26e24] bg-slate-50" 
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#f26e24]" />
                        )}
                        <link.icon className={cn(
                          "h-5 w-5 shrink-0",
                          isActive ? "text-[#f26e24]" : "text-slate-400"
                        )} />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </ScrollArea>
              <div className="border-t border-slate-100 p-4">
                <button
                  onClick={() => signOut({ callbackUrl: '/admin-login' })}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-all active:scale-[0.98]"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
} 
