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
      await signOut({ callbackUrl: '/login' });
    } catch (error) {
      logger.error('Sign out error:', error);
      window.location.href = '/login';
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
        <button className="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-offset-2 rounded-md p-1 transition-colors">
          <Avatar>
            <AvatarFallback className="bg-[#f26e24] text-white">
              {getInitials(user.name || '')}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-goodtimes text-gray-700">
            {user.name || 'User'}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-white shadow-lg border border-gray-200 rounded-md overflow-hidden z-50"
        sideOffset={8}
      >
        <DropdownMenuLabel className="font-goodtimes text-gray-700 px-4 py-2">My Account</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-200" />
        <DropdownMenuItem asChild className="focus:bg-gray-100 focus:text-gray-900">
          <Link href="/profile" className="flex items-center cursor-pointer font-goodtimes px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors w-full">
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="focus:bg-gray-100 focus:text-gray-900">
          <Link href="/bookings" className="flex items-center cursor-pointer font-goodtimes px-4 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors w-full">
            <span>My Rides</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gray-200" />
        <DropdownMenuItem
          className="text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50 cursor-pointer font-goodtimes px-4 py-2 transition-colors"
          onClick={handleSignOut}
        >
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 