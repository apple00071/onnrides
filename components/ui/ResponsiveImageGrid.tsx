import React from 'react';
import Image from 'next/image';

interface ImageItem {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  link?: string;
}

interface ResponsiveImageGridProps {
  images: ImageItem[];
  columns?: {
    sm: number;
    md: number;
    lg: number;
  };
  gap?: string;
  className?: string;
  aspectRatio?: string;
  onClick?: (image: ImageItem, index: number) => void;
}

export function ResponsiveImageGrid({
  images,
  columns = { sm: 1, md: 2, lg: 3 },
  gap = '1rem',
  className = '',
  aspectRatio = '1/1',
  onClick
}: ResponsiveImageGridProps) {
  // Generate grid template columns for different breakpoints
  const gridTemplateColumns = {
    sm: `repeat(${columns.sm}, 1fr)`,
    md: `repeat(${columns.md}, 1fr)`,
    lg: `repeat(${columns.lg}, 1fr)`
  };

  // Handle image click if onClick is provided
  const handleImageClick = (image: ImageItem, index: number) => {
    if (onClick) {
      onClick(image, index);
    }
  };

  if (!images || images.length === 0) {
    return (
      <div className="p-6 text-center bg-gray-50 rounded-lg">
        <p className="text-gray-500">No images available</p>
      </div>
    );
  }

  return (
    <div 
      className={`grid gap-4 ${className}`}
      style={{
        gridTemplateColumns: gridTemplateColumns.sm,
        gap
      }}
    >
      {images.map((image, index) => (
        <div 
          key={`${image.src}-${index}`}
          className={`relative overflow-hidden rounded-lg border border-gray-200 ${onClick ? 'cursor-pointer transition transform hover:scale-[1.02] hover:shadow-md' : ''}`}
          style={{ aspectRatio }}
          onClick={() => handleImageClick(image, index)}
        >
          <div className="absolute inset-0">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes={`
                (max-width: 640px) ${100 / columns.sm}vw, 
                (max-width: 768px) ${100 / columns.md}vw, 
                ${100 / columns.lg}vw
              `}
              className="object-cover"
              priority={index < 4} // Load the first 4 images with priority
            />
          </div>
        </div>
      ))}
      
      {/* Media Queries for Responsive Grid */}
      <style jsx>{`
        @media (min-width: 640px) {
          div {
            grid-template-columns: ${gridTemplateColumns.md};
          }
        }
        
        @media (min-width: 1024px) {
          div {
            grid-template-columns: ${gridTemplateColumns.lg};
          }
        }
      `}</style>
    </div>
  );
} 