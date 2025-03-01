import React from 'react';

interface BusinessStructuredDataProps {
  name: string;
  description: string;
  url: string;
  logo?: string;
  telephone?: string;
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  }[];
  geo?: {
    latitude: string;
    longitude: string;
  }[];
  priceRange?: string;
}

export function BusinessStructuredData({
  name,
  description,
  url,
  logo = 'https://www.onnrides.com/images/logo.png',
  telephone = '+91 9876543210',
  address = [
    {
      streetAddress: 'Plot No. 4, Ayyappa Society',
      addressLocality: 'Madhapur',
      addressRegion: 'Hyderabad',
      postalCode: '500081',
      addressCountry: 'IN',
    },
    {
      streetAddress: '4/7, ESI Hospital Road',
      addressLocality: 'Erragadda',
      addressRegion: 'Hyderabad',
      postalCode: '500038',
      addressCountry: 'IN',
    },
  ],
  geo = [
    {
      latitude: '17.4482421',
      longitude: '78.3874003',
    },
    {
      latitude: '17.4577164',
      longitude: '78.4332043',
    },
  ],
  priceRange = '₹₹',
}: BusinessStructuredDataProps) {
  const locations = address.map((addr, index) => ({
    '@type': 'LocalBusiness',
    name: `${name} - ${addr.addressLocality}`,
    description,
    url: `${url}/locations/${addr.addressLocality.toLowerCase()}`,
    telephone,
    logo,
    image: logo,
    priceRange,
    address: {
      '@type': 'PostalAddress',
      ...addr,
    },
    geo: {
      '@type': 'GeoCoordinates',
      ...geo[index],
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '08:00',
        closes: '20:00',
      },
    ],
  }));

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    description,
    url,
    logo,
    telephone,
    sameAs: [
      'https://www.facebook.com/onnrides',
      'https://www.instagram.com/onnrides',
      'https://twitter.com/onnrides',
    ],
    department: locations,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

interface VehicleStructuredDataProps {
  name: string;
  description: string;
  image: string;
  vehicleType: string;
  modelDate?: string;
  brand?: string;
  fuelType?: string;
  mileageFromOdometer?: string;
  vehicleEngine?: string;
  offers: {
    price: string;
    priceCurrency: string;
    availability: string; // Use InStock, OutOfStock, etc.
    validFrom?: string;
    priceValidUntil?: string;
  };
}

export function VehicleStructuredData({
  name,
  description,
  image,
  vehicleType,
  modelDate = '2023',
  brand = 'Honda',
  fuelType = 'Petrol',
  mileageFromOdometer = '2000 kilometers',
  vehicleEngine = '110cc',
  offers,
}: VehicleStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    name,
    description,
    image,
    vehicleType,
    modelDate,
    brand: {
      '@type': 'Brand',
      name: brand,
    },
    fuelType,
    mileageFromOdometer: {
      '@type': 'QuantitativeValue',
      unitText: 'KMT',
      value: mileageFromOdometer,
    },
    vehicleEngine: {
      '@type': 'EngineSpecification',
      engineType: vehicleEngine,
    },
    offers: {
      '@type': 'Offer',
      ...offers,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

interface RatingStructuredDataProps {
  itemName: string;
  ratingValue: number;
  reviewCount?: number;
  bestRating?: number;
  worstRating?: number;
}

export function RatingStructuredData({
  itemName,
  ratingValue,
  reviewCount = 87,
  bestRating = 5,
  worstRating = 1,
}: RatingStructuredDataProps) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: itemName,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue,
      reviewCount,
      bestRating,
      worstRating,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export default {
  BusinessStructuredData,
  VehicleStructuredData,
  RatingStructuredData,
}; 