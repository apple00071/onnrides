'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import UserNav from './UserNav';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Date and time validation helper
  const validateDateTime = (date: string, time: string) => {
    const selectedDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);

    if (selectedDateTime < now) {
      toast.error('Selected time must be in the future');
      return false;
    }
    return true;
  };

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, setDate: (date: string) => void) => {
    const selectedDate = e.target.value;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (selectedDate < today) {
      toast.error('Cannot select a past date');
      e.target.value = today;
      setDate(today);
    } else {
      setDate(selectedDate);
    }
  };

  // Handle time change
  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>, date: string, setTime: (time: string) => void) => {
    const selectedTime = e.target.value;
    if (validateDateTime(date, selectedTime)) {
      setTime(selectedTime);
    } else {
      // Reset to current hour if invalid
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0') + ':00';
      e.target.value = currentHour;
      setTime(currentHour);
    }
  };

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get available time options
  const getTimeOptions = () => {
    const options = [];
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0');
      const period = i >= 12 ? 'PM' : 'AM';
      const hour12 = i === 0 ? 12 : i > 12 ? i - 12 : i;
      options.push({
        value: `${hour}:00`,
        label: `${hour12}:00 ${period}`
      });
    }
    return options;
  };

  // Don't show navbar on auth pages
  const isAuthPage = pathname?.startsWith('/auth/');
  if (isAuthPage) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-white">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center">
            <div className="relative h-7 md:h-9 w-24 md:w-32">
              <Image
                src="/logo.png"
                alt="OnnRides"
                fill
                className="object-contain"
                priority
                sizes="(max-width: 768px) 96px, 128px"
              />
            </div>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <div className="relative h-7 md:h-9 w-24 md:w-32">
              <Image
                src="/logo.png"
                alt="OnnRides"
                fill
                className="object-contain"
                priority
                sizes="(max-width: 768px) 96px, 128px"
              />
            </div>
          </Link>
          <nav className="hidden md:flex items-center space-x-6 ml-8">
            <Link
              href="/about"
              className="text-sm font-goodtimes text-gray-500 hover:text-[#f26e24]"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-sm font-goodtimes text-gray-500 hover:text-[#f26e24]"
            >
              Contact Us
            </Link>
          </nav>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-4">
          {status === 'loading' ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
          ) : session?.user ? (
            <UserNav user={session.user} />
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="text-sm font-goodtimes text-gray-500 hover:text-[#f26e24]"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="bg-[#f26e24] text-white hover:bg-[#e05d13] px-4 py-2 rounded-md text-sm font-goodtimes transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
        >
          <span className="sr-only">Open menu</span>
          {isMenuOpen ? (
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1">
          <Link
            href="/about"
            className="block px-3 py-2 text-base font-goodtimes text-gray-500 hover:text-[#f26e24] hover:bg-gray-50 rounded-md"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="block px-3 py-2 text-base font-goodtimes text-gray-500 hover:text-[#f26e24] hover:bg-gray-50 rounded-md"
          >
            Contact Us
          </Link>
          {!session?.user && (
            <>
              <Link
                href="/auth/signin"
                className="block px-3 py-2 text-base font-goodtimes text-gray-500 hover:text-[#f26e24] hover:bg-gray-50 rounded-md"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="block px-3 py-2 text-base font-goodtimes text-white bg-[#f26e24] hover:bg-[#e05d13] rounded-md"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
} 