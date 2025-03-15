'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MobileSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
  withText?: boolean;
  text?: string;
  className?: string;
}

export default function MobileSpinner({
  size = 'md',
  color = 'primary',
  withText = true,
  text = 'Loading...',
  className,
}: MobileSpinnerProps) {
  // Size mappings
  const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };
  
  // Color mappings
  const colorMap = {
    primary: 'text-orange-500',
    secondary: 'text-blue-500',
    white: 'text-white',
  };
  
  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <motion.div
        className={cn(
          'rounded-full border-2 border-t-transparent',
          sizeMap[size],
          colorMap[color]
        )}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{ borderTopColor: 'transparent' }}
      />
      
      {withText && (
        <p className={cn(
          'mt-2 text-sm font-medium',
          colorMap[color]
        )}>
          {text}
        </p>
      )}
    </div>
  );
}

// Loading skeleton for mobile cards
export function MobileCardSkeleton() {
  return (
    <div className="bg-white rounded-lg p-4 h-24 animate-pulse shadow-sm">
      <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
      <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
}

// Loading skeleton for stats grid
export function MobileStatsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-lg p-4 h-24 animate-pulse">
          <div className="flex justify-between items-start mb-2">
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="w-6 h-6 rounded-full bg-gray-200"></div>
          </div>
          <div className="h-5 bg-gray-200 rounded w-1/2 mt-3"></div>
        </div>
      ))}
    </div>
  );
}

// Loading skeleton for list items
export function MobileListItemSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="h-3.5 bg-gray-200 rounded w-40 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
          </div>
          <div className="h-3 bg-gray-200 rounded w-3/4 mt-3"></div>
          <div className="flex justify-between mt-3">
            <div className="h-3 bg-gray-200 rounded w-16"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
            <div className="h-3 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Full-page loading skeleton
export function MobileFullPageLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 space-y-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative h-16 w-16 flex items-center justify-center"
      >
        <div className="absolute inset-0 border-4 border-orange-200 rounded-full opacity-75"></div>
        <motion.div
          className="absolute inset-0 border-4 border-transparent border-t-orange-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-md">
          <img src="/logo.png" alt="OnnRides" className="h-6 w-auto" />
        </div>
      </motion.div>
      <p className="text-orange-600 font-medium">Loading OnnRides Admin</p>
    </div>
  );
} 