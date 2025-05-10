import Link from 'next/link';
import { FaFacebookF, FaInstagram } from 'react-icons/fa';

export default function Footer() {
  return (
    <>
      <footer className="bg-white mt-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {/* Brand Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-goodtimes text-[#f26e24]">Onn Rides</h3>
              <p className="text-sm text-gray-600">Ride With Pleasure</p>
              <div className="flex space-x-4">
                <a href="https://www.facebook.com/onnridesofficial" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#f26e24] transition-colors duration-300">
                  <FaFacebookF size={20} />
                </a>
                <a href="https://www.instagram.com/onnridesrentals" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#f26e24] transition-colors duration-300">
                  <FaInstagram size={20} />
                </a>
              </div>
            </div>

            {/* Locations */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Our Locations</h4>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Erragadda Branch</p>
                  <p className="text-sm text-gray-600">R S hotel, Metro Station Erragadda,</p>
                  <p className="text-sm text-gray-600">Prem Nagar, Erragadda,</p>
                  <p className="text-sm text-gray-600">Hyderabad - 500018</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Madhapur Branch</p>
                  <p className="text-sm text-gray-600">1173, Ayyappa Society Main Rd,</p>
                  <p className="text-sm text-gray-600">Ayyappa Society, Mega Hills,</p>
                  <p className="text-sm text-gray-600">Madhapur, Hyderabad - 500081</p>
                </div>
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
                  FAQ&apos;s
                </Link>
              </div>
            </div>

            {/* Policies */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Policies</h4>
              <div className="space-y-2">
                <Link href="/privacy-policy" className="block text-sm text-gray-600 hover:text-[#f26e24]">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="block text-sm text-gray-600 hover:text-[#f26e24]">
                  T & C
                </Link>
                <Link href="/blogs" className="block text-sm text-gray-600 hover:text-[#f26e24]">
                  Blogs
                </Link>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Contact Us</h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">+91 83090 31203</p>
                <p className="text-sm text-gray-600">+91 91824 95481</p>
                <a href="mailto:support@onnrides.com" className="block text-sm text-gray-600 hover:text-[#f26e24]">
                  support@onnrides.com
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              © {new Date().getFullYear()} All rights reserved - Onn Rides
            </div>
          </div>
        </div>
      </footer>

      {/* SEO Content Section */}
      <section className="bg-[#f26e24] py-16 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose max-w-none prose-invert">
            <h1 className="text-3xl font-bold text-white mb-6">Bike Rentals in Hyderabad – Explore the City with Onnrides</h1>
            <h2 className="text-2xl font-semibold text-white mb-4">Unlock the Freedom of Two Wheels in Hyderabad</h2>
            
            <p className="text-white/90 mb-6">
              Looking for convenient and affordable bike rentals in Hyderabad? Onnrides offers the perfect two-wheeler solution to navigate the city with ease. Whether you're cruising through traffic-packed roads or taking a weekend ride to scenic spots around the city, we've got the right bike for you.
            </p>
            
            <p className="text-white/90 mb-8">
              Choose from a wide range of bikes and scooters such as the Honda Activa, Suzuki Access, Yamaha FZ, Bajaj Avenger, Royal Enfield Classic 350, or even a Honda CBR 250. With flexible rental options and easy pickup and drop services, Onnrides is your go-to choice for bike rentals in Hyderabad.
            </p>

            <h2 className="text-2xl font-semibold text-white mb-4">Affordable and Hassle-Free Bike Rental in Hyderabad</h2>
            <p className="text-white/90 mb-6">
              Skip the long-term commitment of buying a bike. With Onnrides, you only pay for the time you ride—no down payments, no EMIs, no maintenance headaches. We offer hourly, daily, weekly, and monthly rental plans to suit every need.
            </p>
            
            <p className="text-white/90 mb-8">
              Whether you're a student, a professional commuter, or an occasional rider, renting a bike in Hyderabad has never been this easy or economical.
            </p>

            <h2 className="text-2xl font-semibold text-white mb-4">Bike Rental Locations in Hyderabad</h2>
            <p className="text-white/90 mb-4">We offer bike rentals in multiple locations across Hyderabad, including:</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Link href="/" className="text-white hover:text-white/80 transition-colors">Ameerpet</Link>
              <Link href="/" className="text-white hover:text-white/80 transition-colors">Erragadda</Link>
              <Link href="/" className="text-white hover:text-white/80 transition-colors">Financial District</Link>
              <Link href="/" className="text-white hover:text-white/80 transition-colors">Gachibowli</Link>
              <Link href="/" className="text-white hover:text-white/80 transition-colors">Gowlidoddi</Link>
              <Link href="/" className="text-white hover:text-white/80 transition-colors">Hitech City</Link>
              <Link href="/" className="text-white hover:text-white/80 transition-colors">Kacheguda Railway Station</Link>
              <Link href="/" className="text-white hover:text-white/80 transition-colors">Kondapur</Link>
              <Link href="/" className="text-white hover:text-white/80 transition-colors">KPBH</Link>
              <Link href="/" className="text-white hover:text-white/80 transition-colors">Kukatpally</Link>
              <Link href="/" className="text-white hover:text-white/80 transition-colors">Madhapur</Link>
              <Link href="/" className="text-white hover:text-white/80 transition-colors">Manikonda</Link>
              <Link href="/" className="text-white hover:text-white/80 transition-colors">Masjid Banda</Link>
              <Link href="/" className="text-white hover:text-white/80 transition-colors">Nampally Railway Station</Link>
              <Link href="/" className="text-white hover:text-white/80 transition-colors">Secunderabad Railway Station</Link>
              <Link href="/" className="text-white hover:text-white/80 transition-colors">SR Nagar</Link>
            </div>
            <p className="text-white/90 mb-8">
              No matter where you are in the city, there's a nearby Onnrides location ready to serve you.
            </p>

            <h2 className="text-2xl font-semibold text-white mb-4">Rent a Bike in Hyderabad Today</h2>
            <p className="text-white/90">
              Whether you're commuting to work, running errands, or exploring the city, Onnrides is your trusted partner for bike rentals in Hyderabad. Book your ride today and experience the convenience, affordability, and freedom of two-wheel travel.
            </p>
          </div>
        </div>
      </section>
    </>
  );
} 