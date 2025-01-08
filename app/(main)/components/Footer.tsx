import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-goodtimes text-[#f26e24]">Onn Rides</h3>
            <p className="text-sm text-gray-600">Ride With Pleasure</p>
          </div>

          {/* Locations */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Our Locations</h4>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Eragadda Location (1st Branch)</p>
              <p className="text-sm text-gray-600">Madhapur Location (2nd Branch)</p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Quick Links</h4>
            <div className="space-y-2">
              <Link href="/" className="block text-sm text-gray-600 hover:text-[#f26e24]">
                Home
              </Link>
              <Link href="/about" className="block text-sm text-gray-600 hover:text-[#f26e24]">
                About Us
              </Link>
              <Link href="/contact" className="block text-sm text-gray-600 hover:text-[#f26e24]">
                Contact Us
              </Link>
              <Link href="/faq" className="block text-sm text-gray-600 hover:text-[#f26e24]">
                FAQ's
              </Link>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Contact Us</h4>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">+91 83090 31203</p>
              <p className="text-sm text-gray-600">+91 91824 95481</p>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Copyright */}
            <div className="text-sm text-gray-600">
              © 2024 All rights reserved - Onn Rides
            </div>
            {/* Legal Links */}
            <div className="flex space-x-4 md:justify-end">
              <Link href="/privacy" className="text-sm text-gray-600 hover:text-[#f26e24]">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-gray-600 hover:text-[#f26e24]">
                T & C
              </Link>
              <Link href="/blog" className="text-sm text-gray-600 hover:text-[#f26e24]">
                Blogs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 