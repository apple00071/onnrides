import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://onnrides.com';
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/settings/',
        '/auth/',
        '/reset-password/',
        '/payment-status/',
        '/payment-recovery/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
} 