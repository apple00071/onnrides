'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { LoadingSpinner } from './loading-spinner';
import { DEFAULT_VEHICLE_IMAGE, preloadImage, getValidImageUrl } from '@/lib/utils/image-utils';

interface OptimizedImageProps {
  src?: string | string[];
  alt: string;
  className?: string;
  fallback?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  fallback = DEFAULT_VEHICLE_IMAGE,
  priority = false,
  quality = 75,
  sizes = '100vw'
}: OptimizedImageProps) {
  const [loading, setLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState(fallback);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      if (!src) {
        if (mounted) {
          setImageSrc(fallback);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(false);

        const imageUrl = Array.isArray(src) ? getValidImageUrl(src) : src;
        
        if (imageUrl !== fallback) {
          await preloadImage(imageUrl);
        }

        if (mounted) {
          setImageSrc(imageUrl);
        }
      } catch (err) {
        if (mounted) {
          console.error('Error loading image:', err);
          setImageSrc(fallback);
          setError(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [src, fallback]);

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <LoadingSpinner size="lg" />
        </div>
      )}
      <Image
        src={imageSrc}
        alt={alt}
        fill
        className={`object-contain transition-opacity duration-300 ${
          loading ? 'opacity-0' : 'opacity-100'
        }`}
        priority={priority}
        quality={quality}
        sizes={sizes}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setImageSrc(fallback);
          setLoading(false);
        }}
      />
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
          Failed to load image
        </div>
      )}
    </div>
  );
} 