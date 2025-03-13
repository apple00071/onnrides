'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { StatsCarousel } from '@/components/ui/stats-carousel';

// Custom SVG Icons as components
const CarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-8 h-8 text-[#f26e24]" fill="currentColor">
    <path d="M135.2 117.4L109.1 192H402.9l-26.1-74.6C372.3 104.6 360.2 96 346.6 96H165.4c-13.6 0-25.7 8.6-30.2 21.4zM39.6 196.8L74.8 96.3C88.3 57.8 124.6 32 165.4 32H346.6c40.8 0 77.1 25.8 90.6 64.3l35.2 100.5c23.2 9.6 39.6 32.5 39.6 59.2V400v48c0 17.7-14.3 32-32 32H448c-17.7 0-32-14.3-32-32V400H96v48c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32V400 256c0-26.7 16.4-49.6 39.6-59.2zM128 288a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm288 32a32 32 0 1 0 0-64 32 32 0 1 0 0 64z"/>
  </svg>
);

const BikeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" className="w-8 h-8 text-[#f26e24]" fill="currentColor">
    <path d="M312 32c-13.3 0-24 10.7-24 24s10.7 24 24 24h25.7l34.6 64H222.9l-27.4-38C191 99.7 183.7 96 176 96H120c-13.3 0-24 10.7-24 24s10.7 24 24 24h43.7l22.1 30.7-26.6 53.1c-10-2.5-20.5-3.8-31.2-3.8C57.3 224 0 281.3 0 352s57.3 128 128 128c65.3 0 119.1-48.9 127-112h49c8.5 0 16.3-4.5 20.7-11.8l84.8-143.5 21.3 42.7c-14.9 15.8-24.1 37.2-24.1 60.6 0 48.6 39.4 88 88 88s88-39.4 88-88c0-39.3-25.8-72.6-61.4-83.8L446.2 144H552c13.3 0 24-10.7 24-24s-10.7-24-24-24H406.7l-34.6-64H440c13.3 0 24-10.7 24-24s-10.7-24-24-24H312zM128 384a32 32 0 1 1 0-64 32 32 0 1 1 0 64zm327.6-186.9l-84 142.4-64.3 .1 36.9-73.8 111.4-68.7z"/>
  </svg>
);

const LocationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="w-6 h-6 text-[#f26e24]" fill="currentColor">
    <path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>
  </svg>
);

const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="w-6 h-6 text-[#f26e24]" fill="currentColor">
    <path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/>
  </svg>
);

const QuestionIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-5 h-5 text-[#f26e24]" fill="currentColor">
    <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM169.8 165.3c7.9-22.3 29.1-37.3 52.8-37.3h58.3c34.9 0 63.1 28.3 63.1 63.1c0 22.6-12.1 43.5-31.7 54.8L280 264.4c-.2 13-10.9 23.6-24 23.6c-13.3 0-24-10.7-24-24V250.5c0-8.6 4.6-16.5 12.1-20.8l44.3-25.4c4.7-2.7 7.6-7.7 7.6-13.1c0-8.4-6.8-15.1-15.1-15.1H222.6c-3.4 0-6.4 2.1-7.5 5.3l-.4 1.2c-4.4 12.5-18.2 19-30.6 14.6s-19-18.2-14.6-30.6l.4-1.2zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/>
  </svg>
);

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

    // Add debug logging for selected times
    console.log('Selected times:', {
      pickupDate,
      pickupTime,
      dropoffDate,
      dropoffTime,
      fullPickupDateTime: `${pickupDate}T${pickupTime}`,
      fullDropoffDateTime: `${dropoffDate}T${dropoffTime}`
    });

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
              <CarIcon />
              <h3 className="text-xl font-medium mb-2 font-sans">Rent A Car</h3>
              <p className="text-gray-600">
                Choose from our fleet of well-maintained vehicles for any occasion.
                From economy to luxury, we have the perfect car for you.
              </p>
            </div>
            <div className="bg-gray-50 p-8 rounded-lg">
              <BikeIcon />
              <h3 className="text-xl font-medium mb-2 font-sans">Rent A Bike</h3>
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
                <LocationIcon />
              </div>
              <h3 className="font-semibold mb-2">Convenient Locations</h3>
              <p className="text-gray-600">Multiple pickup and drop-off points</p>
            </div>
            <div className="text-center">
              <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <StarIcon />
              </div>
              <h3 className="font-semibold mb-2">Best Rates</h3>
              <p className="text-gray-600">Competitive pricing and special offers</p>
            </div>
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
                <QuestionIcon />
                How do I rent a vehicle?
              </h3>
              <p className="mt-2 text-gray-600">
                Simply browse our available vehicles, select your dates, and complete the booking process online.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="font-semibold flex items-center">
                <QuestionIcon />
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