import { MetadataRoute } from 'next';
import { query } from '@/lib/db';

interface Vehicle {
  id: string;
  updated_at: Date;
}

interface VehicleRow {
  id: string;
  updated_at: Date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.onnrides.com';

  // Get all locations
  const locations = [
    'madhapur',
    'gachibowli',
    'hitec-city',
    'kondapur',
    'jubilee-hills',
    'erragadda',
    'ameerpet',
    'sr-nagar'
  ];

  // Get all bike categories
  const bikeCategories = [
    'activa',
    'dio',
    'access',
    'jupiter',
    'pleasure',
    'fascino'
  ];

  // Generate location-specific bike rental URLs
  const locationUrls = locations.map(location => ({
    url: `${baseUrl}/locations/${location}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9
  }));

  // Generate bike category URLs
  const bikeCategoryUrls = bikeCategories.map(category => ({
    url: `${baseUrl}/bikes/${category}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8
  }));

  // Get all available bikes from database
  const vehiclesResult = await query(`
    SELECT 
      id, 
      updated_at
    FROM vehicles
    WHERE type = 'bike' AND is_available = true
  `, []);

  const bikes = vehiclesResult.rows.map((row: VehicleRow) => ({
    id: row.id,
    updated_at: row.updated_at
  })) as Vehicle[];

  // Generate URLs for individual bike pages
  const bikeUrls = bikes.map(bike => ({
    url: `${baseUrl}/vehicles/${bike.id}`,
    lastModified: bike.updated_at || new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8
  }));

  // Define static routes with bike rental focus
  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/bikes`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/vehicles`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/locations`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/bookings`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    }
  ] satisfies MetadataRoute.Sitemap;

  // Combine all URLs and ensure they match the Sitemap type
  return [...staticRoutes, ...locationUrls, ...bikeCategoryUrls, ...bikeUrls] satisfies MetadataRoute.Sitemap;
} 