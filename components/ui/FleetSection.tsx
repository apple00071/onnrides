'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import logger from '@/lib/logger';
import { ArrowRight, Fuel, ShieldCheck, Zap } from 'lucide-react';

interface Vehicle {
  id: string;
  title: string;
  price: string;
  type: string;
  tag: string;
  image: string;
}

const vehicles: Vehicle[] = [
  {
    id: '1',
    title: 'Honda Activa 6G',
    price: '₹199/day',
    type: 'Scooter',
    tag: 'Popular',
    image: '/images/fleet/honda-activa-6g.png',
  },
  {
    id: '2',
    title: 'Royal Enfield Classic 350',
    price: '₹799/day',
    type: 'Cruiser',
    tag: 'Best Seller',
    image: '/images/fleet/317-3178282_royal-enfield-classsic-350-redditch-red-royal-enfield-removebg-preview.png',
  },
  {
    id: '3',
    title: 'Yamaha FZS V3',
    price: '₹449/day',
    type: 'Sports Bike',
    tag: 'Trending',
    image: '/images/fleet/Yamaha-FZS-v3.png',
  },
  {
    id: '4',
    title: 'Yamaha R15 V4',
    price: '₹699/day',
    type: 'Superbike',
    tag: 'Performance',
    image: '/images/fleet/r15-right-side-view-7.avif',
  },
  {
    id: '5',
    title: 'Royal Enfield Bullet 350',
    price: '₹749/day',
    type: 'Cruiser',
    tag: 'Iconic',
    image: '/images/fleet/pngegg.png',
  }
];

export default function FleetSection() {
  const [imageError, setImageError] = useState<{ [key: string]: boolean }>({});

  const handleImageError = (vehicleId: string) => {
    logger.error(`Image load error for vehicle ${vehicleId}`);
    setImageError(prev => ({
      ...prev,
      [vehicleId]: true
    }));
  };

  const PlaceholderSVG = () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <svg
        className="w-20 h-20 text-gray-300"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M19 15v4H5v-4h14m1-2H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1zM7 18.5c-.82 0-1.5-.67-1.5-1.5s.68-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM19 5v4H5V5h14m1-2H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1zM7 8.5c-.82 0-1.5-.67-1.5-1.5S6.18 5.5 7 5.5s1.5.67 1.5 1.5S7.83 8.5 7 8.5z" />
      </svg>
    </div>
  );

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-gray-50 via-white to-orange-50/20 overflow-hidden relative">
      <div className="container mx-auto px-4 mb-12 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-[#f26e24] bg-orange-100/60 rounded-full border border-orange-200 mb-3">
          <Zap className="w-3.5 h-3.5" /> Well-Maintained & Sanitized Fleet
        </span>
        <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
          Explore Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f26e24] to-amber-500">Popular Rides</span>
        </h2>
        <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto mt-3">
          Choose from scooters to premium cruiser bikes. Instant pickup from Madhapur & Erragadda with zero hidden charges.
        </p>
      </div>

      <div className="relative w-full">
        {/* Gradients on edges for smooth marquee fade */}
        <div className="absolute left-0 top-0 bottom-0 w-12 md:w-24 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 md:w-24 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />

        <div className="flex gap-6 animate-scroll w-max py-4">
          {[...vehicles, ...vehicles, ...vehicles].map((vehicle, index) => (
            <div
              key={`${vehicle.id}-${index}`}
              className="flex-none w-[280px] md:w-[320px] bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 overflow-hidden group flex flex-col justify-between"
            >
              <div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full">
                    {vehicle.tag}
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                </div>

                <div className="h-[180px] relative w-full bg-gradient-to-b from-gray-50/50 to-white flex items-center justify-center p-4">
                  {(!vehicle.image || imageError[vehicle.id]) ? (
                    <PlaceholderSVG />
                  ) : (
                    <div className="relative w-full h-full transition-transform duration-300 group-hover:scale-105">
                      <Image
                        src={vehicle.image}
                        alt={vehicle.title}
                        fill
                        className="object-contain"
                        priority={index < 5}
                        onError={() => handleImageError(vehicle.id)}
                        sizes="320px"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 border-t border-gray-100 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500">{vehicle.type}</span>
                  <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                    <Fuel className="w-3 h-3 text-[#f26e24]" /> Petrol
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#f26e24] transition-colors truncate">
                  {vehicle.title}
                </h3>
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-400 block">Starting at</span>
                    <span className="text-xl font-extrabold text-[#f26e24]">{vehicle.price}</span>
                  </div>
                  <Link
                    href="/bikes"
                    className="inline-flex items-center gap-1 bg-gray-900 hover:bg-[#f26e24] text-white text-xs font-bold px-4 py-2.5 rounded-full transition-all duration-300 shadow-sm"
                  >
                    Book Now <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 text-center">
        <Link
          href="/bikes"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#f26e24] to-amber-500 text-white font-bold px-8 py-3.5 rounded-full shadow-lg glow-orange hover:brightness-110 transition-all transform hover:-translate-y-0.5"
        >
          View All Vehicles & Rates <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <style jsx global>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
        .animate-scroll {
          animation: scroll 22s linear infinite;
        }
        @media (max-width: 768px) {
          .animate-scroll {
            animation: scroll 18s linear infinite;
          }
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
} 
