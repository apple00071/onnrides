import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

function generateSitemapXml() {
  const baseUrl = 'https://onnrides.com';
  
  // Static URLs that don't depend on database
  const urls = [
    '',
    '/about',
    '/contact',
    '/vehicles',
    '/terms',
    '/privacy',
    '/faq',
    '/support',
    '/locations',
    '/how-it-works',
  ].map(path => `${baseUrl}${path}`);

  return `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls.map(url => `
        <url>
          <loc>${url}</loc>
          <changefreq>daily</changefreq>
          <priority>0.7</priority>
        </url>
      `).join('')}
    </urlset>`;
}

export async function GET() {
  try {
    const xml = generateSitemapXml();
    
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
} 