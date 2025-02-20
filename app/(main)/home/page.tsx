'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { FaCar, FaBicycle, FaQuestionCircle, FaStar, FaMapMarkerAlt, FaCalendar, FaClock } from 'react-icons/fa';
import { StatsCarousel } from '@/components/ui/stats-carousel';

export default function Home() {
  const router = useRouter();
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [dropoffDate, setDropoffDate] = useState('');
  const [dropoffTime, setDropoffTime] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pickupDate || !pickupTime || !dropoffDate || !dropoffTime) {
      toast.error('Please fill in all fields');
      return;
    }

    const searchParams = new URLSearchParams({
      pickupDate,
      pickupTime,
      dropoffDate,
      dropoffTime
    });

    router.push(`/vehicles?${searchParams.toString()}`);
  };

  // Helper function to convert 24h to 12h format
  const formatTime = (hour: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:00 ${period}`;
  };

  // Generate time options for 24 hours
  const timeOptions = Array.from({ length: 24 }, (_, i) => ({
    value: `${i.toString().padStart(2, '0')}:00`,
    label: formatTime(i)
  }));

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-[100vh] w-full overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-white to-[#f26e24]"></div>

        {/* Left Side Content */}
        <div className="absolute left-0 top-0 h-full w-[40%]">
          <div className="relative h-full flex items-center justify-center">
            <Image
              src="/images/charminar-illustration.png"
              alt="Charminar Illustration"
              width={800}
              height={1000}
              className="object-contain h-[90%] w-auto"
              priority
            />
          </div>
        </div>

        {/* Search Form */}
        <div className="absolute left-[20%] top-[40%] w-[800px]">
          <div className="bg-blue-100/80 backdrop-blur-sm rounded-lg p-8">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="block text-gray-600 mb-2 font-medium">Pickup</label>
                <div className="flex gap-4">
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-[250px] p-2.5 border rounded bg-white/90 text-gray-700"
                    placeholder="dd-mm-yyyy"
                  />
                  <select
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-[150px] p-2.5 border rounded bg-white/90 text-gray-700"
                  >
                    <option value="">Select time</option>
                    {timeOptions.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-600 mb-2 font-medium">Dropoff</label>
                <div className="flex gap-4">
                  <input
                    type="date"
                    value={dropoffDate}
                    onChange={(e) => setDropoffDate(e.target.value)}
                    className="w-[250px] p-2.5 border rounded bg-white/90 text-gray-700"
                    placeholder="dd-mm-yyyy"
                  />
                  <select
                    value={dropoffTime}
                    onChange={(e) => setDropoffTime(e.target.value)}
                    className="w-[150px] p-2.5 border rounded bg-white/90 text-gray-700"
                  >
                    <option value="">Select time</option>
                    {timeOptions.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <button
              onClick={handleSearch}
              className="w-full mt-8 bg-[#f26e24] text-white py-3 rounded text-base font-medium hover:bg-[#e05d13] transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        {/* Right Side Content */}
        <div className="absolute right-0 top-0 h-full w-[60%] bg-[#f26e24]">
          <div className="h-full flex flex-col justify-between">
            <div className="text-white pt-32 pl-12">
              <h1 className="text-5xl md:text-6xl font-bold">
                Discover The Wonders<br />of Hyderabad
              </h1>
            </div>
            <div className="relative w-full h-[400px]">
              <Image
                src="/images/vehicles.png"
                alt="Vehicles"
                fill
                className="object-contain object-right-bottom"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Carousel */}
      <StatsCarousel />

      {/* Services Section */}
      <section className="py-20 max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="bg-gray-50 p-8 rounded-lg">
              <FaCar className="text-4xl text-[#f26e24] mb-4" />
              <h3 className="text-xl font-semibold mb-2">Rent A Car</h3>
              <p className="text-gray-600">
                Choose from our fleet of well-maintained vehicles for any occasion.
                From economy to luxury, we have the perfect car for you.
              </p>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg">
              <FaBicycle className="text-4xl text-[#f26e24] mb-4" />
              <h3 className="text-xl font-semibold mb-2">Rent A Bike</h3>
              <p className="text-gray-600">
                Explore the city on two wheels with our range of bikes.
                Perfect for short trips and eco-friendly transportation.
              </p>
            </div>
          </div>
          <div className="relative h-[400px] rounded-lg overflow-hidden">
            <Image
              src="/images/rental-services.jpg"
              alt="Rental Services"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-[#f26e24]">24h</span>
              </div>
              <h3 className="font-semibold mb-2">24/7 Support</h3>
              <p className="text-gray-600">Round-the-clock assistance for all your needs</p>
            </div>
            <div className="text-center">
              <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaMapMarkerAlt className="text-2xl text-[#f26e24]" />
              </div>
              <h3 className="font-semibold mb-2">Convenient Locations</h3>
              <p className="text-gray-600">Multiple pickup and drop-off points</p>
            </div>
            <div className="text-center">
              <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaStar className="text-2xl text-[#f26e24]" />
              </div>
              <h3 className="font-semibold mb-2">Best Rates</h3>
              <p className="text-gray-600">Competitive pricing and special offers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Reviews Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Customer Saying</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((review) => (
              <div key={review} className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex items-center mb-4">
                  <Image
                    src={`/images/avatar-${review}.jpg`}
                    alt="Customer"
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                  <div className="ml-4">
                    <h4 className="font-semibold">Customer Name</h4>
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <FaStar key={i} className="w-4 h-4" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600">
                  "Great service and well-maintained vehicles. The staff was very helpful
                  and professional. Will definitely use again!"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Locations Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Local Service We Provide</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((location) => (
              <div key={location} className="relative h-32 rounded-lg overflow-hidden group">
                <Image
                  src={`/images/location-${location}.jpg`}
                  alt="Service Location"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                  <span className="text-white font-semibold">Location {location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Have Any Question</h2>
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold flex items-center">
                <FaQuestionCircle className="text-[#f26e24] mr-2" />
                How do I rent a vehicle?
              </h3>
              <p className="mt-2 text-gray-600">
                Simply browse our available vehicles, select your dates, and complete the booking process online.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold flex items-center">
                <FaQuestionCircle className="text-[#f26e24] mr-2" />
                What documents do I need?
              </h3>
              <p className="mt-2 text-gray-600">
                You'll need a valid driver's license, proof of insurance, and a credit card for the security deposit.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 