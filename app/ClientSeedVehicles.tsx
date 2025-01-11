'use client';

import { useEffect } from 'react';
import logger from '@/lib/logger';

const initialVehicles = [
  {
    name: 'Toyota Camry',
    description: 'Comfortable and reliable sedan perfect for family trips',
    type: 'sedan',
    brand: 'Toyota',
    model: 'Camry',
    year: 2022,
    color: 'Silver',
    transmission: 'automatic',
    fuel_type: 'petrol',
    mileage: 15,
    seating_capacity: 5,
    price_per_day: 2500,
    is_available: true,
    image_url: '/images/vehicles/toyota-camry.jpg',
    location: 'Mumbai'
  },
  {
    name: 'Honda City',
    description: 'Elegant and fuel-efficient sedan for city driving',
    type: 'sedan',
    brand: 'Honda',
    model: 'City',
    year: 2021,
    color: 'White',
    transmission: 'automatic',
    fuel_type: 'petrol',
    mileage: 17,
    seating_capacity: 5,
    price_per_day: 2000,
    is_available: true,
    image_url: '/images/vehicles/honda-city.jpg',
    location: 'Delhi'
  },
  {
    name: 'Hyundai Creta',
    description: 'Stylish SUV with advanced features and comfort',
    type: 'suv',
    brand: 'Hyundai',
    model: 'Creta',
    year: 2022,
    color: 'Black',
    transmission: 'automatic',
    fuel_type: 'diesel',
    mileage: 14,
    seating_capacity: 5,
    price_per_day: 3000,
    is_available: true,
    image_url: '/images/vehicles/hyundai-creta.jpg',
    location: 'Bangalore'
  }
];

export default function ClientSeedVehicles() {
  const seedVehicles = async () => {
    try {
      // Check if vehicles already exist
      const response = await fetch('/api/vehicles');
      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }
      const existingVehicles = await response.json();

      logger.debug(`Found ${existingVehicles?.length || 0} existing vehicles`);

      // Only seed if no vehicles exist
      if (existingVehicles?.length > 0) {
        return;
      }

      logger.debug('Attempting to insert initial vehicles:', initialVehicles);

      const insertResponse = await fetch('/api/admin/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(initialVehicles),
      });

      if (!insertResponse.ok) {
        throw new Error('Failed to seed vehicles');
      }

      const data = await insertResponse.json();
      logger.debug('Successfully inserted vehicles:', data);

    } catch (error) {
      logger.error('Comprehensive seeding error:', error);
    }
  };

  useEffect(() => {
    seedVehicles();
  }, []);

  return null;
} 