import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://onnrides.com';

  const staticRoutes = [
    '',
    '/about',
    '/contact',
    '/login',
    '/register',
    '/forgot-password',
    '/vehicles',
    '/bookings',
    '/profile',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 1
  }));

  return [...staticRoutes];
} 