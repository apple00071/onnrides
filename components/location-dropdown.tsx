import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { logger } from '@/lib/logger';

interface LocationDropdownProps {
  locations: string[];
  selectedLocation: string | null;
  onLocationChange: (location: string) => void;
  vehicleId: string;
  startDate?: Date;
  endDate?: Date;
  className?: string;
  vehicleType?: string;
}

export function LocationDropdown({
  locations,
  selectedLocation,
  onLocationChange,
  vehicleId,
  startDate,
  endDate,
  className,
  vehicleType = 'car'
}: LocationDropdownProps) {
  const [availableLocations, setAvailableLocations] = useState<string[]>(locations);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [shouldAutoSelect, setShouldAutoSelect] = useState(false);
  const processingRef = useRef(false);
  const lastSelectionTimeRef = useRef<number>(0);
  const lastSelectedLocationRef = useRef<string | null>(null);

  const handleLocationChange = useCallback((location: string) => {
    if (processingRef.current) {
      logger.info('Skipping location change - already processing', {
        location,
        currentLocation: selectedLocation
      });
      return;
    }

    const now = Date.now();
    if (
      location === lastSelectedLocationRef.current ||
      now - lastSelectionTimeRef.current < 200 // 200ms debounce
    ) {
      return;
    }

    lastSelectedLocationRef.current = location;
    lastSelectionTimeRef.current = now;
    processingRef.current = true;

    logger.info('Processing location change:', {
      location,
      previousLocation: selectedLocation,
      vehicleId,
      vehicleType
    });

    onLocationChange(location);
    
    setTimeout(() => {
      processingRef.current = false;
    }, 200);
  }, [onLocationChange, selectedLocation, vehicleId, vehicleType]);

  // Reset selection when vehicle changes
  useEffect(() => {
    if (!isInitialLoad) {
      return;
    }

    logger.info('Initial load, checking locations:', {
      locations,
      currentSelection: selectedLocation
    });

    // Never auto-select on initial load
    setShouldAutoSelect(false);
    setAvailableLocations(locations);
    setIsInitialLoad(false);
  }, [locations, selectedLocation, isInitialLoad]);

  const fetchAvailableLocations = useCallback(async () => {
    if (!startDate || !endDate) {
      logger.info('No dates provided, using default locations:', {
        vehicleId,
        vehicleType,
        locations,
        shouldAutoSelect,
        initialLocationCount: locations.length,
        currentSelection: selectedLocation
      });
      setAvailableLocations(locations);
      setIsInitialLoad(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        pickupDate: startDate.toISOString().split('T')[0],
        pickupTime: startDate.toISOString().split('T')[1].split('.')[0],
        dropoffDate: endDate.toISOString().split('T')[0],
        dropoffTime: endDate.toISOString().split('T')[1].split('.')[0],
        type: vehicleType
      });

      const response = await fetch(`/api/vehicles?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch available locations');
      }

      const data = await response.json();
      const vehicle = data.vehicles.find((v: any) => v.id === vehicleId);
      
      if (vehicle?.available_locations) {
        setAvailableLocations(vehicle.available_locations);
      } else {
        setAvailableLocations([]);
        if (selectedLocation) {
          handleLocationChange('');
        }
      }
      setIsInitialLoad(false);
    } catch (error) {
      logger.error('Error fetching available locations:', error);
      setAvailableLocations([]);
      if (selectedLocation) {
        handleLocationChange('');
      }
      setIsInitialLoad(false);
    }
  }, [vehicleId, startDate, endDate, locations, selectedLocation, vehicleType, shouldAutoSelect, handleLocationChange]);

  useEffect(() => {
    fetchAvailableLocations();
  }, [fetchAvailableLocations]);

  if (shouldAutoSelect && availableLocations.length === 1) {
    return (
      <div className={className}>
        <Select value={selectedLocation || availableLocations[0]} onValueChange={handleLocationChange}>
          <SelectTrigger>
            <SelectValue>{selectedLocation || availableLocations[0]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={availableLocations[0]}>
              {availableLocations[0]}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className={className}>
      <Select
        value={selectedLocation || ''}
        onValueChange={handleLocationChange}
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