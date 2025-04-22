'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import UserNav from './UserNav';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { User, LogOut, Home, Phone, Info, Car, UserCircle, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

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
      <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
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
    <>
      <header className={`sticky top-0 z-50 w-full bg-white transition-all duration-300 ${scrolled ? 'shadow-md' : 'border-b'} m-0 p-0`}>
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="relative h-8 md:h-9 w-28 md:w-32">
                <Image
                  src="/logo.png"
                  alt="OnnRides"
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 768px) 112px, 128px"
                />
              </div>
            </Link>
            <nav className="hidden md:flex items-center space-x-6 ml-8">
              <Link
                href="/about"
                className="text-sm font-goodtimes text-gray-500 hover:text-[#f26e24] transition-colors"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-sm font-goodtimes text-gray-500 hover:text-[#f26e24] transition-colors"
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
                  className="text-sm font-goodtimes text-gray-500 hover:text-[#f26e24] transition-colors"
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
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:text-[#f26e24] hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-offset-2 transition-colors"
            aria-expanded={isMenuOpen}
          >
            <span className="sr-only">Open menu</span>
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${
          isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        } transition-all duration-300 ease-in-out`}
        aria-hidden={!isMenuOpen}
      >
        {/* Overlay */}
        <div
          className={`fixed inset-0 bg-black transition-opacity duration-300 ${
            isMenuOpen ? 'bg-opacity-50' : 'bg-opacity-0'
          }`}
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />

        {/* Sidebar */}
        <div 
          className={`fixed inset-y-0 right-0 w-full max-w-sm bg-white h-full shadow-xl flex flex-col transform ${
            isMenuOpen ? 'translate-x-0' : 'translate-x-full'
          } transition-transform duration-300 ease-in-out overflow-y-auto`}
        >
          <div className="sticky top-0 px-4 pt-5 pb-4 flex items-center justify-between z-10 bg-white">
            <Link href="/" onClick={() => setIsMenuOpen(false)} className="inline-block">
              <div className="relative h-8 w-28">
                <Image
                  src="/logo.png"
                  alt="OnnRides"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
            <button 
              className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:text-[#f26e24] hover:bg-gray-200 focus:outline-none transition-colors"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Info Section */}
          {session?.user ? (
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-[#f26e24] flex items-center justify-center text-white shadow-sm">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{session.user.name}</p>
                  <p className="text-sm text-gray-500">{session.user.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 border-b">
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/auth/signin"
                  className="flex justify-center items-center bg-[#f26e24] text-white py-2.5 rounded-md font-medium text-sm transition-colors hover:bg-[#e05d13]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="flex justify-center items-center border border-[#f26e24] text-[#f26e24] py-2.5 rounded-md font-medium text-sm transition-colors hover:bg-orange-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="pt-2 pb-4 flex flex-col">
            <Link
              href="/"
              className="flex items-center py-3 px-4 text-gray-600 hover:bg-gray-50 hover:text-[#f26e24] transition-colors active:bg-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              <Home className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="text-base font-medium">Home</span>
            </Link>
            <Link
              href="/about"
              className="flex items-center py-3 px-4 text-gray-600 hover:bg-gray-50 hover:text-[#f26e24] transition-colors active:bg-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              <Info className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="text-base font-medium">About Us</span>
            </Link>
            <Link
              href="/contact"
              className="flex items-center py-3 px-4 text-gray-600 hover:bg-gray-50 hover:text-[#f26e24] transition-colors active:bg-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              <Phone className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="text-base font-medium">Contact Us</span>
            </Link>
            
            {/* Rest of navigation links... */}
            
            {session?.user && (
              <Link
                href="/profile"
                className="flex items-center py-3 px-4 text-gray-600 hover:bg-gray-50 hover:text-[#f26e24] transition-colors active:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                <UserCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="text-base font-medium">My Profile</span>
              </Link>
            )}
            
            {/* Logout button if user is logged in */}
            {session?.user && (
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  // Add your logout function here
                }}
                className="flex items-center py-3 px-4 text-gray-600 hover:bg-gray-50 hover:text-red-500 w-full text-left transition-colors active:bg-gray-100"
              >
                <LogOut className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="text-base font-medium">Logout</span>
              </button>
            )}
          </nav>
          
          {/* Footer for mobile menu */}
          <div className="mt-auto p-4 border-t text-center text-xs text-gray-500">
            <p>© {new Date().getFullYear()} OnnRides</p>
            <p className="mt-1">Best vehicle rental service in Hyderabad</p>
          </div>
        </div>
      </div>
    </>
  );
}