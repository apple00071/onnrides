'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import MobileSpinner from './MobileSpinner';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  pullDistance?: number;
  loadingColor?: 'primary' | 'secondary' | 'white';
  className?: string;
  disabled?: boolean;
}

export default function PullToRefresh({
  onRefresh,
  children,
  pullDistance = 100,
  loadingColor = 'primary',
  className,
  disabled = false,
}: PullToRefreshProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, pullDistance / 2, pullDistance], [0, 0.5, 1]);
  const controls = useAnimation();

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (disabled || refreshing) return;
    if (window.scrollY <= 0) {
      setPullStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isPulling || disabled || refreshing) return;
    const touchY = e.touches[0].clientY;
    const pullDistance = touchY - pullStartY;
    
    if (pullDistance > 0 && window.scrollY <= 0) {
      // Calculate pull resistance (gets harder to pull as you pull further)
      const dampedPull = Math.min(
        pullDistance * 0.4, // Apply resistance factor
        150 // Maximum pull distance
      );
      y.set(dampedPull);
      e.preventDefault(); // Prevent default scrolling behavior
    }
  };

  // Handle touch end
  const handleTouchEnd = async () => {
    if (!isPulling || disabled) return;
    
    const pullPosition = y.get();
    setIsPulling(false);
    
    if (pullPosition >= pullDistance) {
      // Trigger refresh
      setRefreshing(true);
      
      // Animate to loading position
      await controls.start({
        y: 50,
        transition: { duration: 0.2 },
      });
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setRefreshing(false);
        // Reset position with animation
        controls.start({
          y: 0,
          transition: { duration: 0.3 },
        });
      }
    } else {
      // Reset position with animation
      controls.start({
        y: 0,
        transition: { duration: 0.2 },
      });
    }
  };

  useEffect(() => {
    // Set initial position
    y.set(0);
  }, [y]);

  return (
    <div
      ref={containerRef}
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ overflowY: 'visible', touchAction: refreshing ? 'none' : 'auto' }}
    >
      <motion.div
        className="relative w-full"
        style={{ y }}
        animate={controls}
      >
        {/* Pull indicator */}
        <motion.div 
          className="absolute left-0 right-0 flex justify-center -top-16"
          style={{ opacity }}
        >
          <MobileSpinner 
            size="sm" 
            color={loadingColor} 
            withText={refreshing}
            text="Refreshing..."
          />
        </motion.div>
        
        {/* Main content */}
        {children}
      </motion.div>
    </div>
  );
} 