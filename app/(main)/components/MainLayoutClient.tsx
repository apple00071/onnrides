'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import logger from '@/lib/logger';
import Navbar from './Navbar';
import Footer from './Footer';
import { ProviderRegistry } from '../../context-providers/ProviderRegistry';

// Remove Inter font import and configuration

export default function MainLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  // Scroll to top on route change - implementation directly integrated here
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      logger.debug('Scrolled to top in main layout');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            'name': 'OnnRides',
            'description': 'Bike and vehicle rental service in Hyderabad with convenient locations in Madhapur and Erragadda.',
            'url': 'https://www.onnrides.com',
            'logo': 'https://www.onnrides.com/images/logo.png',
            'sameAs': [
              'https://www.facebook.com/onnrides',
              'https://www.instagram.com/onnrides',
              'https://twitter.com/onnrides'
            ],
            'address': [
              {
                '@type': 'PostalAddress',
                'addressLocality': 'Madhapur',
                'addressRegion': 'Telangana',
                'addressCountry': 'IN',
                'postalCode': '500081'
              },
              {
                '@type': 'PostalAddress',
                'addressLocality': 'Erragadda',
                'addressRegion': 'Telangana',
                'addressCountry': 'IN',
                'postalCode': '500018'
              }
            ],
            'geo': {
              '@type': 'GeoCoordinates',
              'latitude': '17.4449',
              'longitude': '78.3812'
            },
            'telephone': '+91-8247494622',
            'email': 'support@onnrides.com',
            'openingHoursSpecification': {
              '@type': 'OpeningHoursSpecification',
              'dayOfWeek': [
                'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
              ],
              'opens': '08:00',
              'closes': '20:00'
            },
            'priceRange': '₹₹',
            'offers': {
              '@type': 'AggregateOffer',
              'priceCurrency': 'INR',
              'lowPrice': '25',
              'highPrice': '500',
              'offerCount': '20'
            }
          })
        }}
      />
      <ProviderRegistry includeRazorpay={true} includeClientOnly={true}>
        <Navbar />
        {children}
        <Footer />
      </ProviderRegistry>
    </div>
  );
} 