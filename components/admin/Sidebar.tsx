"use client";

import React, { createContext, useContext, useState } from 'react';
import Link from 'next/link';
import { FaChevronLeft } from 'react-icons/fa';
import { signOut } from 'next-auth/react';
import { FaSignOutAlt } from 'react-icons/fa';
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
  animate: boolean;
};

const SidebarContext = createContext<SidebarContextType>({
  open: true,
  setOpen: () => {},
  animate: false,
});

export function useSidebar() {
  return useContext(SidebarContext);
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const [animate, setAnimate] = useState(false);

  React.useEffect(() => {
    setAnimate(true);
  }, []);

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function Sidebar({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useSidebar();

  return (
    <div
      className={`h-screen bg-white border-r border-gray-200 transition-all duration-300 ${
        open ? 'w-[300px]' : 'w-[60px]'
      }`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <Link href="/admin/dashboard" className="flex items-center">
          <span className={`font-bold text-xl text-[#f26e24] ${!open && 'hidden'}`}>
            ONNRIDES
          </span>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none"
        >
          <FaChevronLeft
            className={`h-5 w-5 text-gray-500 transition-transform ${
              !open && 'transform rotate-180'
            }`}
          />
        </button>
      </div>
      {children}
    </div>
  );
}

export function SidebarBody({ children }: { children: React.ReactNode }) {
  return <div className="py-4">{children}</div>;
}

interface SidebarLinkProps {
  link: {
    href: string;
    label: string;
    icon: React.ReactNode;
  };
  className?: string;
  props?: any;
}

export function SidebarLink({ link, className = '', props = {} }: SidebarLinkProps) {
  const { open } = useSidebar();

  return (
    <Link
      href={link.href}
      className={`flex items-center px-4 py-3 text-gray-600 hover:bg-gray-50 ${className}`}
      {...props}
    >
      <span className="inline-flex">{link.icon}</span>
      {open && <span className="ml-3">{link.label}</span>}
    </Link>
  );
}

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & Omit<React.ComponentProps<typeof motion.div>, 'children' | 'className'>) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.div
      className={cn(
        "h-screen fixed left-0 top-0 px-4 py-4 hidden md:flex md:flex-col bg-white dark:bg-neutral-800 w-[300px] flex-shrink-0 shadow-lg z-50",
        className
      )}
      animate={{
        width: animate ? (open ? "300px" : "60px") : "300px",
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center h-16 border-b">
          <motion.span
            animate={{
              display: animate ? (open ? "inline-block" : "none") : "inline-block",
              opacity: animate ? (open ? 1 : 0) : 1,
            }}
            className="text-xl font-bold text-[#f26e24]"
          >
            Admin Panel
          </motion.span>
        </div>
        <div className="flex-1 py-4">
          {children}
        </div>
        <div className="border-t p-4">
          <button
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="flex w-full items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <FaSignOutAlt className="h-5 w-5" />
            <motion.span
              animate={{
                display: animate ? (open ? "inline-block" : "none") : "inline-block",
                opacity: animate ? (open ? 1 : 0) : 1,
              }}
            >
              Sign out
            </motion.span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & Omit<React.ComponentProps<"div">, 'children' | 'className'>) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-16 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-white dark:bg-neutral-800 w-full fixed top-0 left-0 z-50 shadow-sm"
        )}
        {...props}
      >
        <div className="flex justify-between items-center w-full">
          <span className="text-xl font-bold text-[#f26e24]">Admin Panel</span>
          <Menu
            className="text-neutral-800 dark:text-neutral-200 cursor-pointer"
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
                "fixed h-full w-full inset-0 bg-white dark:bg-neutral-900 p-10 z-[100] flex flex-col justify-between",
                className
              )}
            >
              <div>
                <div
                  className="absolute right-10 top-10 z-50 text-neutral-800 dark:text-neutral-200 cursor-pointer"
                  onClick={() => setOpen(!open)}
                >
                  <X />
                </div>
                <div className="mt-10">
                  {children}
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/admin/login' })}
                className="flex items-center space-x-2 text-gray-600"
              >
                <FaSignOutAlt className="h-5 w-5" />
                <span>Sign out</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}; 