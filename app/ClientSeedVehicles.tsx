'use client';

import { useEffect } from 'react';

export default function ClientSeedVehicles() {
  const seedVehicles = async () => {
    try {
      console.log('Starting vehicle seeding process...');

      // Check if vehicles already exist
      const response = await fetch('/api/vehicles');
      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }
      const existingVehicles = await response.json();

      console.log(`Found ${existingVehicles?.length || 0} existing vehicles`);

      // Only seed if no vehicles exist
      if (existingVehicles?.length > 0) {
        return;
      }

      const initialVehicles = [
        {
          name: 'Honda Activa 6G',
          type: 'bike',
          price: 500,
          location: { city: 'Mumbai', state: 'Maharashtra' },
          images: ['/vehicles/activa.jpg'],
          description: 'Popular scooter with great mileage',
          features: ['110cc engine', 'Electric start', 'Drum brakes'],
          specifications: {
            engine: '110cc',
            mileage: '60 kmpl',
            transmission: 'Automatic'
          }
        },
        {
          name: 'Royal Enfield Classic 350',
          type: 'bike',
          price: 1200,
          location: { city: 'Delhi', state: 'Delhi' },
          images: ['/vehicles/classic350.jpg'],
          description: 'Iconic motorcycle with powerful performance',
          features: ['350cc engine', 'Electric start', 'Disc brakes'],
          specifications: {
            engine: '350cc',
            mileage: '35 kmpl',
            transmission: 'Manual'
          }
        }
      ];

      console.log('Attempting to insert initial vehicles:', initialVehicles);

      const insertResponse = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(initialVehicles)
      });

      if (!insertResponse.ok) {
        throw new Error('Failed to seed vehicles');
      }

      const data = await insertResponse.json();
      console.log('Successfully inserted vehicles:', data);

    } catch (error) {
      console.error('Comprehensive seeding error:', error);
    }
  };

  useEffect(() => {
    seedVehicles();
  }, []);

  return null;
} 