import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger } from '@/utils/logger';

const VehiclesPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentLocation, setCurrentLocation] = useState<string | undefined>(undefined);
  const isInitialMount = useRef(true);
  const processingLocationChange = useRef(false);
  const lastLocationUpdateRef = useRef<string | undefined>(undefined);
  const lastLocationUpdateTimeRef = useRef<number>(0);
  const [vehicleType, setVehicleType] = useState<'car' | 'bike'>('car');
  const [urlParams, setUrlParams] = useState<{
    pickupDate: string;
    pickupTime: string;
    dropoffDate: string;
    dropoffTime: string;
    type: 'car' | 'bike';
    location: string | null;
  }>({
    pickupDate: '',
    pickupTime: '',
    dropoffDate: '',
    dropoffTime: '',
    type: 'car',
    location: null
  });

  const handleLocationSelect = useCallback((location: string) => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastLocationUpdateTimeRef.current;

    // Skip if already processing or if update is too soon
    if (processingLocationChange.current || timeSinceLastUpdate < 1000) {
      logger.info('Skipping location update:', {
        reason: processingLocationChange.current ? 'processing' : 'too soon',
        timeSinceLastUpdate,
        location,
        currentLocation,
        lastUpdate: lastLocationUpdateRef.current,
        timestamp: now
      });
      return;
    }

    // Skip if the location hasn't actually changed
    if (location === lastLocationUpdateRef.current) {
      logger.info('Skipping location update - no change:', {
        location,
        currentLocation,
        lastUpdate: lastLocationUpdateRef.current,
        timestamp: now
      });
      return;
    }

    logger.info('Processing location update:', {
      location,
      vehicleType,
      currentLocation,
      lastUpdate: lastLocationUpdateRef.current,
      timestamp: now
    });

    processingLocationChange.current = true;
    lastLocationUpdateTimeRef.current = now;
    lastLocationUpdateRef.current = location;

    try {
      // Update state first
      setCurrentLocation(location);

      // Update URL with the new location
      const currentParams = new URLSearchParams(window.location.search);
      const oldLocation = currentParams.get('location');

      // Only update URL if location actually changed
      if (location !== oldLocation) {
        // Remove old location if exists
        currentParams.delete('location');

        // Only add new location if it's not empty
        if (location) {
          currentParams.set('location', location);
        }

        // Use replace to prevent history stack buildup
        router.replace(`/vehicles?${currentParams.toString()}`, {
          scroll: false
        });
      }
    } finally {
      // Reset processing flag after a delay
      setTimeout(() => {
        processingLocationChange.current = false;
      }, 1000); // Match the timeout in LocationDropdown
    }
  }, [currentLocation, vehicleType, router]);

  // Update URL params once on mount and when URL changes
  useEffect(() => {
    const locationFromUrl = searchParams.get('location');
    const pickupDate = searchParams.get('pickupDate') || '';
    const pickupTime = searchParams.get('pickupTime') || '';
    const dropoffDate = searchParams.get('dropoffDate') || '';
    const dropoffTime = searchParams.get('dropoffTime') || '';
    const type = (searchParams.get('type') as 'car' | 'bike') || 'car';

    // Only update on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setVehicleType(type);
      if (locationFromUrl) {
        setCurrentLocation(locationFromUrl);
        lastLocationUpdateRef.current = locationFromUrl;
        lastLocationUpdateTimeRef.current = Date.now();
      }
      setUrlParams({
        pickupDate,
        pickupTime,
        dropoffDate,
        dropoffTime,
        type,
        location: locationFromUrl
      });
      return;
    }

    // For subsequent updates, only update if we're not processing a change
    // and enough time has passed since the last update
    const now = Date.now();
    const timeSinceLastUpdate = now - lastLocationUpdateTimeRef.current;

    if (!processingLocationChange.current && timeSinceLastUpdate >= 1000) {
      const newParams = {
        pickupDate,
        pickupTime,
        dropoffDate,
        dropoffTime,
        type,
        location: locationFromUrl
      };

      const paramsChanged = JSON.stringify(newParams) !== JSON.stringify(urlParams);

      if (paramsChanged) {
        logger.info('URL params changed:', {
          old: urlParams,
          new: newParams,
          lastUpdate: lastLocationUpdateRef.current,
          timeSinceLastUpdate,
          timestamp: now
        });

        setUrlParams(newParams);

        // Only update location if it's changed and not from a user interaction
        if (locationFromUrl !== lastLocationUpdateRef.current) {
          setCurrentLocation(locationFromUrl || undefined);
          lastLocationUpdateRef.current = locationFromUrl || undefined;
          lastLocationUpdateTimeRef.current = now;
        }
      }
    }
  }, [searchParams]);

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default VehiclesPage; 