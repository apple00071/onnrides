import logger from '@/lib/logger';
'use client';

import Image from 'next/image';

interface VehicleImagesProps {
  images: string[];
  vehicleName: string;
}

export default function VehicleImages({ images, vehicleName }: VehicleImagesProps) {
  return (
    <div>
      <div className="aspect-video relative rounded-lg overflow-hidden bg-gray-100">
        {images[0] ? (
          <Image
            src={images[0]}
            alt={vehicleName}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            className="object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder-car.jpg';
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-gray-400">No image available</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-4 gap-2 mt-2">
        {images.slice(1).map((image: string, index: number) => (
          <div key={index} className="aspect-video relative rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={image}
              alt={`${vehicleName} ${index + 2}`}
              fill
              sizes="(max-width: 768px) 25vw, 12.5vw"
              className="object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder-car.jpg';
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
} 