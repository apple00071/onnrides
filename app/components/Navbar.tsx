'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'
import toast from 'react-hot-toast'

export default function Navbar() {
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
      toast.success('Logged out successfully')
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Failed to logout')
    }
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const menu = document.getElementById('mobile-menu')
      if (menu && !menu.contains(event.target as Node) && isMenuOpen) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  return (
    <nav className="bg-white shadow-lg fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <Image
                src="/logo.png"
                alt="OnnRides Logo"
                width={40}
                height={40}
                className="block h-8 w-auto"
              />
              <span className="ml-2 text-xl font-bold text-gray-900">OnnRides</span>
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-[#f26e24]"
              >
                Home
              </Link>
              <Link
                href="/vehicles"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-[#f26e24]"
              >
                Vehicles
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-[#f26e24]"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-[#f26e24]"
              >
                Contact
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {!loading && (
              <>
                {user ? (
                  <div className="relative ml-3">
                    <div className="flex space-x-4">
                      <Link
                        href="/bookings"
                        className="text-gray-500 hover:text-[#f26e24] px-3 py-2 rounded-md text-sm font-medium"
                      >
                        My Bookings
                      </Link>
                      <Link
                        href="/profile"
                        className="text-gray-500 hover:text-[#f26e24] px-3 py-2 rounded-md text-sm font-medium"
                      >
                        Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="text-gray-500 hover:text-[#f26e24] px-3 py-2 rounded-md text-sm font-medium"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex space-x-4">
                    <Link
                      href="/login"
                      className="text-gray-500 hover:text-[#f26e24] px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      className="bg-[#f26e24] text-white hover:bg-[#e05d13] px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Register
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#f26e24]"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!isMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`sm:hidden ${isMenuOpen ? 'block' : 'hidden'}`} id="mobile-menu">
        <div className="pt-2 pb-3 space-y-1">
          <Link
            href="/"
            className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:text-[#f26e24] hover:bg-gray-50"
          >
            Home
          </Link>
          <Link
            href="/vehicles"
            className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:text-[#f26e24] hover:bg-gray-50"
          >
            Vehicles
          </Link>
          <Link
            href="/about"
            className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:text-[#f26e24] hover:bg-gray-50"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:text-[#f26e24] hover:bg-gray-50"
          >
            Contact
          </Link>
          {!loading && (
            <>
              {user ? (
                <>
                  <Link
                    href="/bookings"
                    className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:text-[#f26e24] hover:bg-gray-50"
                  >
                    My Bookings
                  </Link>
                  <Link
                    href="/profile"
                    className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:text-[#f26e24] hover:bg-gray-50"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:text-[#f26e24] hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block pl-3 pr-4 py-2 text-base font-medium text-gray-500 hover:text-[#f26e24] hover:bg-gray-50"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="block pl-3 pr-4 py-2 text-base font-medium bg-[#f26e24] text-white hover:bg-[#e05d13]"
                  >
                    Register
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  )
} 