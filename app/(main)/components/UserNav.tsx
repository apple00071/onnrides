'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import logger from '@/lib/logger';

interface UserNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function UserNav({ user }: UserNavProps) {
  const handleSignOut = async () => {
    try {
      // First clear session via next-auth
      await signOut({ redirect: false });

      // Then call our custom logout endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      // Clear any local storage data
      localStorage.clear();
      sessionStorage.clear();

      // Redirect to sign in page
      window.location.href = '/auth/signin';
    } catch (error) {
      logger.error('Sign out error:', error);
      // Force reload even on error to ensure user is signed out
      window.location.href = '/auth/signin';
    }
  };

  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase() || 'U';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center space-x-3 focus:outline-none">
          <Avatar>
            <AvatarFallback className="bg-[#f26e24] text-white">
              {getInitials(user.name || '')}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-gray-700">
            {user.name || 'User'}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center cursor-pointer">
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/bookings" className="flex items-center cursor-pointer">
            <span>My Rides</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
          onClick={handleSignOut}
        >
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 