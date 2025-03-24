interface LocationData {
  name: string;
  streetAddress: string;
  addressLocality: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  areaServed: string[];
  openingHours: {
    opens: string;
    closes: string;
  };
  priceRange: string;
  telephone: string;
}

export default function LocationStructuredData({
  locations,
  baseUrl = 'https://onnrides.com'
}: {
  locations: LocationData[];
  baseUrl?: string;
}) {
  const structuredData = locations.map(location => ({
    '@context': 'https://schema.org',
    '@type': 'BikeRental',
    '@id': `${baseUrl}/locations/${location.addressLocality.toLowerCase()}#business`,
    name: `${location.name} - ${location.addressLocality}`,
    image: [
      `${baseUrl}/images/locations/${location.addressLocality.toLowerCase()}-1.jpg`,
      `${baseUrl}/images/locations/${location.addressLocality.toLowerCase()}-2.jpg`
    ],
    '@graph': [
      {
        '@type': 'LocalBusiness',
        name: location.name,
        address: {
          '@type': 'PostalAddress',
          streetAddress: location.streetAddress,
          addressLocality: location.addressLocality,
          addressRegion: 'Telangana',
          postalCode: location.postalCode,
          addressCountry: 'IN'
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: location.latitude,
          longitude: location.longitude
        },
        url: `${baseUrl}/locations/${location.addressLocality.toLowerCase()}`,
        telephone: location.telephone,
        priceRange: location.priceRange,
        areaServed: location.areaServed.map(area => ({
          '@type': 'City',
          name: area
        })),
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday'
          ],
          opens: location.openingHours.opens,
          closes: location.openingHours.closes
        }
      },
      {
        '@type': 'Service',
        name: 'Bike Rental Service',
        provider: {
          '@type': 'LocalBusiness',
          name: location.name
        },
        areaServed: {
          '@type': 'City',
          name: location.addressLocality
        },
        serviceType: ['Bike Rental', 'Scooter Rental', 'Vehicle Rental'],
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'INR',
          lowPrice: '199',
          highPrice: '2999',
          offerCount: '50+'
        }
      }
    ]
  }));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData)
      }}
    />
  );
} 