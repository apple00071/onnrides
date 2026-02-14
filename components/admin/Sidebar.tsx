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
  Trash2,
  ReceiptIndianRupee,
  BarChart3,
  RotateCcw
} from 'lucide-react';

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
    href: '/admin/cleanup',
    label: 'Clean Up Data',
    icon: Trash2
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

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.div
        initial={false}
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
        animate={{
          width: (isOpen || isHovered) ? 192 : 64,
          transition: { duration: 0.2, ease: "easeInOut" }
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-background shadow-xl transition-shadow",
          "hidden md:flex",
          (isHovered && !isOpen) && "shadow-2xl ring-1 ring-black/5"
        )}
      >
        <div className="flex h-16 items-center justify-center px-4">
          <div className={cn(
            "relative h-8 transition-all duration-200",
            (isOpen || isHovered) ? "w-28" : "w-8"
          )}>
            <Image
              src="/logo.png"
              alt="OnnRides Admin"
              fill
              className="object-contain"
              priority
              sizes="(max-width: 768px) 100vw, 112px"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-hidden">
          <nav className="grid gap-1 px-2">
            {sidebarLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  pathname === link.href ? "bg-accent" : "transparent"
                )}
              >
                <link.icon className="h-5 w-5 shrink-0" />
                <span className={cn(
                  "whitespace-nowrap transition-all duration-200",
                  (isOpen || isHovered) ? "opacity-100 w-auto" : "opacity-0 w-0 md:hidden"
                )}>
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>
        </ScrollArea>
      </motion.div>

      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-background border-b md:hidden z-50">
        <div className="flex h-full items-center justify-between px-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="md:hidden"
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900 line-clamp-1">
                {sidebarLinks.find(link => link.href === pathname)?.label || 'Admin'}
              </span>
            </div>
          </div>
          <div className="relative h-7 w-24">
            <Image
              src="/logo.png"
              alt="OnnRides Admin"
              fill
              className="object-contain"
              priority
              sizes="96px"
            />
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && isMobile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-40 bg-black/80 md:hidden backdrop-blur-sm"
              onClick={toggle}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-[220px] bg-background shadow-lg md:hidden"
            >
              <div className="flex h-16 items-center justify-between px-4 border-b">
                <div className="relative h-8 w-28">
                  <Image
                    src="/logo.png"
                    alt="OnnRides Admin"
                    fill
                    className="object-contain"
                    priority
                    sizes="112px"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggle}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <ScrollArea className="flex-1 overflow-hidden">
                <nav className="grid gap-1 p-2">
                  {sidebarLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={toggle}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                        "hover:bg-accent hover:text-accent-foreground transition-colors",
                        pathname === link.href ? "bg-accent" : "transparent"
                      )}
                    >
                      <link.icon className="h-5 w-5" />
                      <span>{link.label}</span>
                    </Link>
                  ))}
                </nav>
              </ScrollArea>
              <div className="border-t p-4">
                <button
                  onClick={() => signOut({ callbackUrl: '/admin-login' })}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
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