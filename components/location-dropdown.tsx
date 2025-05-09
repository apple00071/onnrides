import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import logger from '@/lib/logger';

interface LocationDropdownProps {
  locations: string[] | string;
  selectedLocation: string | null;
  onLocationChange: (location: string) => void;
  vehicleId: string;
  startDate?: Date;
  endDate?: Date;
  className?: string;
}

const parseLocations = (locations: string[] | string): string[] => {
  if (Array.isArray(locations)) {
    return locations.map(loc => {
      // Handle cases where the location might be a JSON string
      if (typeof loc === 'string' && (loc.startsWith('[') || loc.startsWith('"'))) {
        try {
          // Remove any extra quotes and brackets
          const cleaned = loc.replace(/[\[\]"]/g, '');
          return cleaned;
        } catch (e) {
          return loc;
        }
      }
      return loc;
    });
  }
  
  if (typeof locations === 'string') {
    try {
      // Handle string that might be a JSON array
      if (locations.startsWith('[')) {
        const parsed = JSON.parse(locations);
        return Array.isArray(parsed) ? parsed.map(loc => 
          typeof loc === 'string' ? loc.replace(/[\[\]"]/g, '') : loc
        ) : [];
      }
      // Handle single location string
      return [locations.replace(/[\[\]"]/g, '')];
    } catch (e) {
      return [locations];
    }
  }
  
  return [];
};

export function LocationDropdown({
  locations,
  selectedLocation,
  onLocationChange,
  vehicleId,
  startDate,
  endDate,
  className
}: LocationDropdownProps) {
  const [availableLocations, setAvailableLocations] = useState<string[]>(parseLocations(locations));
  const isInitialMountRef = useRef(true);
  const isFetchingRef = useRef(false);
  const processingRef = useRef(false);
  const lastSelectedLocationRef = useRef<string | null>(selectedLocation);
  const lastChangeTimeRef = useRef<number>(0);
  const componentIdRef = useRef<string>(`${vehicleId}-${Math.random()}`);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update lastSelectedLocationRef when selectedLocation prop changes
  useEffect(() => {
    if (!processingRef.current) {
      lastSelectedLocationRef.current = selectedLocation;
    }
  }, [selectedLocation]);

  // Update availableLocations when locations prop changes
  useEffect(() => {
    setAvailableLocations(parseLocations(locations));
  }, [locations]);

  const fetchAvailableLocations = useCallback(async () => {
    if (!startDate || !endDate || isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      const params = new URLSearchParams({
        pickupDate: startDate.toISOString().split('T')[0],
        pickupTime: startDate.toISOString().split('T')[1].split('.')[0],
        dropoffDate: endDate.toISOString().split('T')[0],
        dropoffTime: endDate.toISOString().split('T')[1].split('.')[0],
      });

      const response = await fetch(`/api/vehicles?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch available locations');
      }
      
      const data = await response.json();
      const vehicle = data.vehicles.find((v: any) => v.id === vehicleId);
      
      if (vehicle?.available_locations) {
        setAvailableLocations(parseLocations(vehicle.available_locations));
      } else {
        setAvailableLocations([]);
      }
    } catch (error) {
      logger.error('Error fetching available locations:', error);
      setAvailableLocations([]);
    } finally {
      isFetchingRef.current = false;
    }
  }, [vehicleId, startDate, endDate]);

  const handleLocationChange = useCallback((location: string) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const now = Date.now();
    const timeSinceLastChange = now - lastChangeTimeRef.current;

    // Skip if already processing or if change is too soon
    if (processingRef.current || timeSinceLastChange < 1000) {
      logger.info('Skipping location change:', {
        reason: processingRef.current ? 'processing' : 'too soon',
        timeSinceLastChange,
        location,
        lastSelected: lastSelectedLocationRef.current,
        componentId: componentIdRef.current,
        timestamp: now
      });
      return;
    }

    // Skip if selecting the same location
    if (location === lastSelectedLocationRef.current) {
      logger.info('Skipping location change - same location:', {
        location,
        lastSelected: lastSelectedLocationRef.current,
        componentId: componentIdRef.current,
        timestamp: now
      });
      return;
    }

    processingRef.current = true;
    lastChangeTimeRef.current = now;

    logger.info('Processing location change:', {
      location,
      previousLocation: selectedLocation,
      componentId: componentIdRef.current,
      timestamp: now
    });

    // Set a timeout to update the location
    timeoutRef.current = setTimeout(() => {
      try {
        lastSelectedLocationRef.current = location;
        onLocationChange(location);
      } finally {
        processingRef.current = false;
        timeoutRef.current = null;
      }
    }, 100);

  }, [onLocationChange, selectedLocation]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Only fetch available locations when necessary
  useEffect(() => {
    if (!isInitialMountRef.current) {
      fetchAvailableLocations();
    } else {
      isInitialMountRef.current = false;
    }
  }, [fetchAvailableLocations]);

  return (
    <div className={className}>
      <Select
        value={selectedLocation || ''}
        onValueChange={handleLocationChange}
        disabled={processingRef.current}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select location" />
        </SelectTrigger>
        <SelectContent>
          {availableLocations.map((location) => (
            <SelectItem key={location} value={location}>
              {location}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 