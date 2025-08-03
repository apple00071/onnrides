'use client';

import Image from 'next/image';
import { useState } from 'react';
import logger from '@/lib/logger';

interface Vehicle {
  id: string;
  title: string;
  image: string;
}

// Static vehicles data with actual images
const vehicles: Vehicle[] = [
  {
    id: '1',
    title: 'Honda Activa 6G',
    image: '/images/fleet/honda-activa-6g.png',
  },
  {
    id: '2',
    title: 'Royal Enfield Classic 350',
    image: '/images/fleet/317-3178282_royal-enfield-classsic-350-redditch-red-royal-enfield-removebg-preview.png',
  },
  {
    id: '3',
    title: 'Yamaha FZS',
    image: '/images/fleet/Yamaha-FZS-v3.png',
  },
  {
    id: '4',
    title: 'Yamaha R15',
    image: '/images/fleet/r15-right-side-view-7.avif',
  },
  {
    id: '5',
    title: 'Royal Enfield',
    image: '/images/fleet/pngegg.png',
  }
];

export default function FleetSection() {
  const [imageError, setImageError] = useState<{[key: string]: boolean}>({});

  const handleImageError = (vehicleId: string) => {
    logger.error(`Image load error for vehicle ${vehicleId}`);
    setImageError(prev => ({
      ...prev,
      [vehicleId]: true
    }));
  };

  const PlaceholderSVG = () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <svg
        className="w-24 h-24 text-gray-300"
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M19 15v4H5v-4h14m1-2H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1zM7 18.5c-.82 0-1.5-.67-1.5-1.5s.68-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM19 5v4H5V5h14m1-2H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1zM7 8.5c-.82 0-1.5-.67-1.5-1.5S6.18 5.5 7 5.5s1.5.67 1.5 1.5S7.83 8.5 7 8.5z"/>
      </svg>
    </div>
  );

  return (
    <section className="py-16 overflow-hidden">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-8">Our Fleet</h2>
        <div className="relative">
          <div className="flex gap-8 animate-scroll">
            {[...vehicles, ...vehicles].map((vehicle, index) => (
              <div 
                key={`${vehicle.id}-${index}`} 
                className="flex-none w-[300px] bg-white rounded-lg shadow-sm overflow-hidden transform transition-transform duration-300 hover:scale-105"
              >
                <div className="h-[200px] relative w-full bg-gray-100 flex items-center justify-center">
                  {(!vehicle.image || imageError[vehicle.id]) ? (
                    <PlaceholderSVG />
                  ) : (
                    <div className="relative w-[80%] h-[80%]">
                      <Image
                        src={vehicle.image}
                        alt={vehicle.title}
                        fill
                        className="object-contain"
                        priority
                        onError={() => handleImageError(vehicle.id)}
                        sizes="300px"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
} 