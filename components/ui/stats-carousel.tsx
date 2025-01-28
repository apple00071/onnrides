'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface StatItem {
  value: string;
  label: string;
  image: string;
  imageAlt: string;
}

const stats: StatItem[] = [
  {
    value: '7,50,000+',
    label: 'Total KMS',
    image: '/images/carousel/suzuki-baleno.png',
    imageAlt: 'Car rental in Hyderabad'
  },
  {
    value: '150+',
    label: 'Vehicle Available',
    image: '/images/carousel/Yamaha-YZF-R15-V3-130120211636.png',
    imageAlt: 'Bike rental in Hyderabad'
  },
  {
    value: '75K+',
    label: 'Happy Customer',
    image: '/images/carousel/sonet.png',
    imageAlt: 'Car rental in Hyderabad'
  }
];

export function StatsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % stats.length);
    }, 4000); // Increased duration to 4 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (carouselRef.current) {
      const translateX = currentIndex * -100;
      carouselRef.current.style.transform = `translateX(${translateX}%)`;
    }
  }, [currentIndex]);

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-r from-gray-900 to-gray-800">
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 z-10" />
      <div 
        ref={carouselRef}
        className="flex transition-transform duration-700 ease-in-out"
        style={{ width: `${stats.length * 100}%` }}
      >
        {stats.map((stat, index) => (
          <div
            key={index}
            className="relative w-full flex-shrink-0"
            style={{ width: `${100 / stats.length}%` }}
          >
            <div className="relative aspect-[16/9] md:aspect-[21/9] lg:aspect-[24/9]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-full h-full max-w-[800px] max-h-[400px]">
                  <Image
                    src={stat.image}
                    alt={stat.imageAlt}
                    fill
                    className="object-contain"
                    priority={index === 0}
                  />
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="text-center text-white">
                  <h3 className="text-5xl md:text-6xl font-bold mb-3 text-primary">
                    {stat.value}
                  </h3>
                  <p className="text-xl md:text-2xl font-medium">
                    {stat.label}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-20">
        {stats.map((_, index) => (
          <button
            key={index}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-primary w-8' 
                : 'bg-white/50 hover:bg-white/80'
            }`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </section>
  );
} 