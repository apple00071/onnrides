import Link from 'next/link';
import { FaFacebookF, FaInstagram } from 'react-icons/fa';
import { MapPin, Phone, Mail, ShieldCheck, CreditCard } from 'lucide-react';

export default function Footer() {
  return (
    <>
      <footer className="bg-white text-gray-600 mt-auto border-t border-gray-200/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
            {/* Brand Section */}
            <div className="space-y-4 md:col-span-1">
              <h3 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-1">
                <span className="text-[#f26e24]">Mister</span> Rides
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Hyderabad's premier 2-wheeler rental service. Rent Activa, Access, RE Classic 350 & sports bikes starting @ ₹199/day.
              </p>
              <div className="flex space-x-3 pt-2">
                <a href="https://www.facebook.com/Mister Ridesofficial" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-[#f26e24] hover:text-white transition-all shadow-sm">
                  <FaFacebookF size={15} />
                </a>
                <a href="https://www.instagram.com/misterrides/" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-[#f26e24] hover:text-white transition-all shadow-sm">
                  <FaInstagram size={15} />
                </a>
              </div>
            </div>

            {/* Hub Locations */}
            <div className="space-y-4 md:col-span-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2">Hub Locations</h4>
              <div className="space-y-3 text-xs">
                <div>
                  <p className="font-semibold text-[#f26e24] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Erragadda Hub
                  </p>
                  <p className="text-gray-500 mt-0.5">R S Hotel, Erragadda Metro Station, Hyderabad - 500018</p>
                </div>
                <div>
                  <p className="font-semibold text-[#f26e24] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Madhapur Hub
                  </p>
                  <p className="text-gray-500 mt-0.5">Plot 69, Road 57, Mega Hills, Madhapur - 500081</p>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4 md:col-span-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2">Quick Links</h4>
              <div className="space-y-2.5 text-xs">
                <Link href="/" className="block text-gray-600 hover:text-[#f26e24] font-medium transition-colors">
                  Home
                </Link>
                <Link href="/about" className="block text-gray-600 hover:text-[#f26e24] font-medium transition-colors">
                  About Us
                </Link>
                <Link href="/contact" className="block text-gray-600 hover:text-[#f26e24] font-medium transition-colors">
                  Contact Us
                </Link>
                <Link href="/faq" className="block text-gray-600 hover:text-[#f26e24] font-medium transition-colors">
                  Frequently Asked Questions
                </Link>
              </div>
            </div>

            {/* Policies */}
            <div className="space-y-4 md:col-span-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2">Policies</h4>
              <div className="space-y-2.5 text-xs">
                <Link href="/privacy-policy" className="block text-gray-600 hover:text-[#f26e24] font-medium transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="block text-gray-600 hover:text-[#f26e24] font-medium transition-colors">
                  Terms & Conditions
                </Link>
                <Link href="/blogs" className="block text-gray-600 hover:text-[#f26e24] font-medium transition-colors">
                  Blogs & News
                </Link>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4 md:col-span-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 border-b border-gray-100 pb-2">Helpline & Support</h4>
              <div className="space-y-2 text-xs">
                <p className="text-gray-900 font-bold flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#f26e24]" /> +91 83090 31203
                </p>
                <p className="text-gray-900 font-bold flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#f26e24]" /> +91 91824 95481
                </p>
                <a href="mailto:support@misterrides.com" className="block text-gray-600 hover:text-[#f26e24] font-medium transition-colors mt-2 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#f26e24]" /> support@misterrides.com
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Copyright Section */}
          <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
            <div>
              © {new Date().getFullYear()} <span className="font-semibold text-gray-800">Mister Rides</span> (Formerly Onn Rides). All rights reserved.
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-50 rounded-full border border-gray-200 text-gray-600 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 256-Bit SSL Encrypted
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-50 rounded-full border border-gray-200 text-gray-600 font-medium">
                <CreditCard className="w-3.5 h-3.5 text-[#f26e24]" /> Razorpay & Cashfree
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Light SEO Content Section */}
      <section className="bg-gradient-to-b from-orange-50/40 to-gray-50 py-16 text-gray-700 border-t border-orange-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose max-w-none text-gray-600 text-sm leading-relaxed">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-4">Bike Rentals in Hyderabad – Explore the City with Mister Rides</h1>
            <h2 className="text-lg font-bold text-gray-800 mb-3">Unlock the Freedom of Two Wheels in Hyderabad</h2>

            <p className="mb-4">
              Looking for convenient and affordable bike rentals in Hyderabad? Mister Rides offers the perfect two-wheeler solution to navigate the city with ease. Whether you're cruising through traffic-packed roads or taking a weekend ride to scenic spots around the city, we've got the right bike for you.
            </p>

            <p className="mb-6">
              Choose from a wide range of bikes and scooters such as the Honda Activa, Suzuki Access, Yamaha FZ, Bajaj Avenger, Royal Enfield Classic 350, or even a Honda CBR 250. With flexible rental options and easy pickup and drop services, Mister Rides is your go-to choice for bike rentals in Hyderabad.
            </p>

            <h2 className="text-lg font-bold text-gray-800 mb-3">Affordable and Hassle-Free Bike Rental in Hyderabad</h2>
            <p className="mb-4">
              Skip the long-term commitment of buying a bike. With Mister Rides, you only pay for the time you ride—no down payments, no EMIs, no maintenance headaches. We offer hourly, daily, weekly, and monthly rental plans to suit every need.
            </p>

            <h2 className="text-lg font-bold text-gray-800 mb-3">Popular Pickup Locations in Hyderabad</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6 text-xs">
              {['Ameerpet', 'Erragadda', 'Financial District', 'Gachibowli', 'Gowlidoddi', 'Hitech City', 'Kacheguda', 'Kondapur', 'KPBH', 'Kukatpally', 'Madhapur', 'Manikonda', 'Masjid Banda', 'Nampally', 'Secunderabad', 'SR Nagar'].map((loc) => (
                <Link key={loc} href="/" className="text-gray-600 hover:text-[#f26e24] py-1 transition-colors flex items-center gap-1">
                  • {loc}
                </Link>
              ))}
            </div>

            <p className="text-xs text-gray-500">
              Mister Rides is your trusted partner for bike rentals in Hyderabad. Book your ride today and experience the convenience, affordability, and freedom of two-wheel travel.
            </p>
          </div>
        </div>
      </section>
    </>
  );
} 
