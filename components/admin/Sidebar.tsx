"use client";

import React, { createContext, useContext, useState } from 'react';
import Link, { LinkProps } from 'next/link';
import Image from 'next/image';
import { FaChevronLeft } from 'react-icons/fa';
import { signOut } from 'next-auth/react';
import { FaSignOutAlt } from 'react-icons/fa';
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSidebar } from '@/hooks/use-sidebar';
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

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

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
  const { isOpen, toggle } = useSidebar();

  return (
    <>
      <motion.div
        initial={false}
        animate={{
          width: isOpen ? 256 : 80,
          transition: { duration: 0.2 }
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-background",
          "md:flex"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggle}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
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

      {/* Mobile overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-40 bg-black/80 md:hidden"
          onClick={toggle}
        />
      )}
    </>
  );
}

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: SidebarLink;
  className?: string;
} & Omit<LinkProps, "href">) => {
  const pathname = usePathname();
  const Icon = link.icon;
  const isActive = pathname === link.href;

  return (
    <Link
      href={link.href}
      className={cn(
        'flex items-center gap-x-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
        isActive && 'bg-accent text-accent-foreground',
        className
      )}
      {...props}
    >
      <Icon className="h-4 w-4" />
      {link.label}
    </Link>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  const isNoHover = className?.includes('no-hover');
  
  return (
    <motion.div
      className={cn(
        "h-screen fixed left-0 top-0 py-0 hidden md:flex md:flex-col bg-white dark:bg-neutral-800 w-[300px] flex-shrink-0 shadow-lg",
        className
      )}
      animate={{
        width: animate ? (open ? "300px" : "60px") : "300px",
      }}
      onMouseEnter={isNoHover ? undefined : () => setOpen(true)}
      onMouseLeave={isNoHover ? undefined : () => setOpen(false)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-14 px-4 flex flex-row md:hidden items-center justify-between bg-white dark:bg-neutral-800 w-full shadow-sm fixed top-0 left-0 right-0 z-50"
        )}
        {...props}
      >
        <div className="flex justify-between items-center w-full">
          <div className="relative h-10 w-40">
            <Image
              src="/logo.png"
              alt="OnnRides Admin"
              fill
              className="object-contain"
              priority
              sizes="(max-width: 768px) 160px, 120px"
            />
          </div>
          <Menu
            className="text-neutral-800 dark:text-neutral-200 cursor-pointer h-6 w-6"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-white dark:bg-neutral-900 p-6 z-[100] flex flex-col",
                className
              )}
            >
              <div className="flex justify-between items-center mb-6">
                <div className="relative h-10 w-40">
                  <Image
                    src="/logo.png"
                    alt="OnnRides Admin"
                    fill
                    className="object-contain"
                    priority
                    sizes="(max-width: 768px) 160px, 120px"
                  />
                </div>
                <X
                  className="text-neutral-800 dark:text-neutral-200 cursor-pointer h-6 w-6"
                  onClick={() => setOpen(false)}
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}; 