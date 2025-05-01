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
  Trash2
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
    href: '/admin/trip-initiation',
    label: 'Trip Initiation',
    icon: QrCode
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
  const { isOpen, toggle, isMobile } = useSidebar();

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.div
        initial={false}
        animate={{
          width: isOpen ? 256 : 80,
          transition: { duration: 0.2 }
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-background",
          "hidden md:flex" // Hide on mobile, show on desktop
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
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
        </div>

        <ScrollArea className="flex-1 overflow-hidden">
          <nav className="grid gap-1 px-2">
            {sidebarLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                  "hover:bg-accent hover:text-accent-foreground",
                  pathname === link.href ? "bg-accent" : "transparent"
                )}
              >
                <link.icon className="h-5 w-5" />
                <span className={cn(
                  "opacity-100 transition-opacity",
                  !isOpen && "opacity-0 md:hidden"
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
        <div className="flex h-full items-center justify-between px-4">
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
            className="md:hidden"
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && isMobile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/80 md:hidden"
              onClick={toggle}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 20 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-background shadow-lg md:hidden"
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
                  <X className="h-6 w-6" />
                </Button>
              </div>
              <ScrollArea className="flex-1 overflow-hidden">
                <nav className="grid gap-1 p-4">
                  {sidebarLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={toggle}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                        "hover:bg-accent hover:text-accent-foreground",
                        pathname === link.href ? "bg-accent" : "transparent"
                      )}
                    >
                      <link.icon className="h-5 w-5" />
                      <span>{link.label}</span>
                    </Link>
                  ))}
                </nav>
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
} 