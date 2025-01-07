'use client';

import { useEffect } from 'react';

export default function ClientSeedVehicles() {
  useEffect(() => {
    async function seedVehicles() {
      try {
        console.log('Starting vehicle seeding process...');

        // Check if vehicles already exist
        const response = await fetch('/api/vehicles');
        if (!response.ok) {
          throw new Error('Failed to fetch vehicles');
        }
        const existingVehicles = await response.json();

        console.log(`Found ${existingVehicles?.length || 0} existing vehicles`);

        // If no vehicles exist, seed initial vehicles
        if (existingVehicles && existingVehicles.length === 0) {
          const initialVehicles = [
            {
              name: 'City Cruiser',
              type: 'car',
              model: 'Sedan',
              year: 2022,
              daily_rate: 50,
              availability: true,
              image_url: '/images/city-cruiser.jpg',
              description: 'Comfortable city sedan perfect for urban driving'
            },
            {
              name: 'Mountain Explorer',
              type: 'bike',
              model: 'Adventure Bike',
              year: 2023,
              daily_rate: 30,
              availability: true,
              image_url: '/images/mountain-explorer.jpg',
              description: 'Rugged bike for off-road adventures'
            },
            {
              name: 'Urban Glider',
              type: 'scooter',
              model: 'Electric Scooter',
              year: 2023,
              daily_rate: 20,
              availability: true,
              image_url: '/images/urban-glider.jpg',
              description: 'Eco-friendly electric scooter for city commutes'
            }
          ];

          console.log('Attempting to insert initial vehicles:', initialVehicles);

          const insertResponse = await fetch('/api/vehicles/seed', {
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
          console.log('Successfully inserted vehicles:', data);
        }
      } catch (error) {
        console.error('Comprehensive seeding error:', error);
      }
    }

    seedVehicles();
  }, []);

  return null;
} 