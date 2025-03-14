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

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
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

export const Sidebar = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return children;
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

export const SidebarLink = ({
  link,
  className,
  ...props
}: {
  link: Links;
  className?: string;
  props?: LinkProps;
}) => {
  const { open, animate } = useSidebar();
  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2 font-goodtimes",
        className
      )}
      {...props}
    >
      {link.icon}
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {link.label}
      </motion.span>
    </Link>
  );
}; 