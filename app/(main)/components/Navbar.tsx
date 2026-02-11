'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import UserNav from './UserNav';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { User, LogOut, Home, Phone, Info, Car, UserCircle, Menu, X, Truck, MapPin } from 'lucide-react';

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
              <>
                {session.user.role === 'delivery_partner' && (
                  <nav className="flex items-center space-x-6 mr-4">
                    <Link
                      href="/delivery-bookings"
                      className="text-sm font-goodtimes text-gray-500 hover:text-[#f26e24] transition-colors"
                    >
                      Deliveries
                    </Link>
                    <Link
                      href="/delivery-partners"
                      className="text-sm font-goodtimes text-gray-500 hover:text-[#f26e24] transition-colors"
                    >
                      Partner Dashboard
                    </Link>
                  </nav>
                )}
                <UserNav user={session.user} />
              </>
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
        className={`fixed inset-0 z-50 md:hidden ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          } transition-all duration-300 ease-in-out`}
        aria-hidden={!isMenuOpen}
      >
        {/* Overlay */}
        <div
          className={`fixed inset-0 bg-black transition-opacity duration-300 ${isMenuOpen ? 'bg-opacity-50' : 'bg-opacity-0'
            }`}
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 right-0 w-full max-w-sm bg-white h-full shadow-xl flex flex-col transform ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'
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
                  sizes="112px"
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

          {/* Mobile Menu Links */}
          <div className="px-4 py-6 space-y-6 flex-1 overflow-y-auto">
            {session?.user ? (
              <>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-10 w-10 rounded-full bg-[#f26e24] flex items-center justify-center text-white font-semibold">
                    {session.user.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div className="font-goodtimes text-gray-900">{session.user.name || 'User'}</div>
                    <div className="text-sm text-gray-500">{session.user.email || ''}</div>
                  </div>
                </div>
                {session.user.role === 'delivery_partner' && (
                  <>
                    <Link
                      href="/delivery-bookings"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <Truck className="h-5 w-5 text-[#f26e24]" />
                      <span className="font-goodtimes text-gray-700">Deliveries</span>
                    </Link>
                    <Link
                      href="/delivery-partners"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <MapPin className="h-5 w-5 text-[#f26e24]" />
                      <span className="font-goodtimes text-gray-700">Partner Dashboard</span>
                    </Link>
                  </>
                )}
                <Link
                  href="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <UserCircle className="h-5 w-5 text-[#f26e24]" />
                  <span className="font-goodtimes text-gray-700">Profile</span>
                </Link>
                <Link
                  href="/bookings"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <Car className="h-5 w-5 text-[#f26e24]" />
                  <span className="font-goodtimes text-gray-700">My Rides</span>
                </Link>
                <div className="border-t border-gray-200 my-4"></div>
              </>
            ) : null}

            {/* Common menu links */}
            <Link
              href="/"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <Home className="h-5 w-5 text-[#f26e24]" />
              <span className="font-goodtimes text-gray-700">Home</span>
            </Link>
            <Link
              href="/about"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <Info className="h-5 w-5 text-[#f26e24]" />
              <span className="font-goodtimes text-gray-700">About</span>
            </Link>
            <Link
              href="/contact"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <Phone className="h-5 w-5 text-[#f26e24]" />
              <span className="font-goodtimes text-gray-700">Contact Us</span>
            </Link>

            {/* Auth buttons */}
            <div className="border-t border-gray-200 my-4"></div>
            {session?.user ? (
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  signOut({ callbackUrl: '/login' });
                }}
                className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-red-50 text-red-600 transition-colors w-full"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-goodtimes">Sign Out</span>
              </button>
            ) : (
              <div className="space-y-4">
                <Link
                  href="/auth/signin"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700 transition-colors w-full"
                >
                  <User className="h-4 w-4 mr-2" />
                  <span className="font-goodtimes">Sign In</span>
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center px-4 py-2 bg-[#f26e24] text-white rounded-md hover:bg-[#e05d13] transition-colors w-full"
                >
                  <span className="font-goodtimes">Sign Up</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}