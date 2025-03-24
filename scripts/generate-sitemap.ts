import { db } from '../lib/db';
import fs from 'fs';
import path from 'path';

interface SitemapURL {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

async function generateSitemap() {
  const baseUrl = 'https://onnrides.com';
  const currentDate = new Date().toISOString().split('T')[0];
  
  // Static pages with their priorities
  const staticPages: SitemapURL[] = [
    { loc: '/', lastmod: currentDate, changefreq: 'daily', priority: '1.0' },
    { loc: '/vehicles', lastmod: currentDate, changefreq: 'daily', priority: '0.9' },
    { loc: '/about', lastmod: currentDate, changefreq: 'monthly', priority: '0.7' },
    { loc: '/contact', lastmod: currentDate, changefreq: 'monthly', priority: '0.7' },
    { loc: '/login', lastmod: currentDate, changefreq: 'monthly', priority: '0.6' },
    { loc: '/register', lastmod: currentDate, changefreq: 'monthly', priority: '0.6' },
    { loc: '/terms', lastmod: currentDate, changefreq: 'yearly', priority: '0.4' },
    { loc: '/privacy-policy', lastmod: currentDate, changefreq: 'yearly', priority: '0.4' },
    { loc: '/faq', lastmod: currentDate, changefreq: 'monthly', priority: '0.7' }
  ];

  try {
    // Get all vehicles
    const vehicles = await db
      .selectFrom('vehicles')
      .select(['id', 'name', 'type', 'location', 'updated_at'])
      .where('is_available', '=', true)
      .execute();

    // Add vehicle pages to sitemap
    const vehiclePages: SitemapURL[] = vehicles.map(vehicle => ({
      loc: `/vehicles/${vehicle.id}`,
      lastmod: new Date(vehicle.updated_at).toISOString().split('T')[0],
      changefreq: 'daily',
      priority: '0.8'
    }));

    // Get all locations
    const locations = await db
      .selectFrom('vehicles')
      .select('location')
      .distinct()
      .execute();

    // Add location pages to sitemap
    const locationPages: SitemapURL[] = locations
      .flatMap(loc => loc.location.split(','))
      .filter((value, index, self) => self.indexOf(value) === index)
      .map(location => ({
        loc: `/locations/${encodeURIComponent(location.trim().toLowerCase())}`,
        lastmod: currentDate,
        changefreq: 'weekly',
        priority: '0.7'
      }));

    // Combine all URLs
    const allUrls = [...staticPages, ...vehiclePages, ...locationPages];

    // Generate XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(url => `  <url>
    <loc>${baseUrl}${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    // Write sitemap to public directory
    fs.writeFileSync(path.join(process.cwd(), 'public', 'sitemap.xml'), sitemap);
    console.log('Sitemap generated successfully!');

  } catch (error) {
    console.error('Error generating sitemap:', error);
    process.exit(1);
  }
}

generateSitemap(); 