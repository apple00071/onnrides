import { Metadata } from 'next';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import LocationStructuredData from '@/components/ui/LocationStructuredData';

interface LocationPageProps {
  params: {
    location: string;
  };
}

// Generate metadata for each location
export async function generateMetadata({ params }: LocationPageProps): Promise<Metadata> {
  const location = decodeURIComponent(params.location);
  const formattedLocation = location.charAt(0).toUpperCase() + location.slice(1);

  return {
    title: `Bike & Vehicle Rental in ${formattedLocation}, Hyderabad | OnnRides`,
    description: `Rent bikes, scooters & vehicles in ${formattedLocation}, Hyderabad. Best rates, wide selection of vehicles, and excellent service. Book now!`,
    keywords: [
      `bike rental ${formattedLocation}`,
      `scooter rental ${formattedLocation}`,
      `vehicle rental ${formattedLocation}`,
      `two wheeler rent ${formattedLocation}`,
      `bike hire ${formattedLocation}`,
      'affordable bike rental',
      'hourly bike rental',
      'daily bike rental',
      'OnnRides Hyderabad'
    ],
  };
}

export default async function LocationPage({ params }: LocationPageProps) {
  const location = decodeURIComponent(params.location).toLowerCase();
  
  // Get vehicles available in this location using type-safe query
  const vehicles = await db
    .selectFrom('vehicles')
    .selectAll()
    .where(eb => eb.or([
      eb('location', 'like', `%${location.toLowerCase()}%`),
      eb('location', 'like', `%${location.toUpperCase()}%`)
    ]))
    .where('is_available', '=', true)
    .execute();

  if (vehicles.length === 0) {
    notFound();
  }

  const formattedLocation = location.charAt(0).toUpperCase() + location.slice(1);
  
  // Location data for structured data
  const locationData = {
    name: `OnnRides ${formattedLocation}`,
    streetAddress: getLocationAddress(location),
    addressLocality: formattedLocation,
    postalCode: getLocationPostalCode(location),
    latitude: getLocationCoordinates(location).lat,
    longitude: getLocationCoordinates(location).lng,
    areaServed: getNearbyAreas(location),
    openingHours: {
      opens: '08:00',
      closes: '20:00'
    },
    priceRange: '₹₹',
    telephone: '+91-8247494622'
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Locations', href: '/locations' },
          { label: formattedLocation, href: `/locations/${location}` }
        ]}
        className="mb-8"
      />

      {/* Location Structured Data */}
      <LocationStructuredData locations={[locationData]} />

      {/* Page Content */}
      <h1 className="text-3xl font-bold mb-6">
        Bike & Vehicle Rental in {formattedLocation}
      </h1>

      {/* Location Description */}
      <div className="prose max-w-none mb-8">
        <p>
          Looking for reliable bike and vehicle rental services in {formattedLocation}, Hyderabad?
          OnnRides offers a wide selection of well-maintained vehicles at competitive rates.
          Whether you need a bike for a few hours or a vehicle for several days, we've got you covered.
        </p>
      </div>

      {/* Available Vehicles */}
      <h2 className="text-2xl font-semibold mb-4">Available Vehicles</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <div key={vehicle.id} className="border rounded-lg p-4">
            {/* Vehicle details */}
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper functions for location data
function getLocationAddress(location: string): string {
  const addresses: Record<string, string> = {
    madhapur: '1173, Ayyappa Society Main Rd, Ayyappa Society, Mega Hills, Madhapur',
    erragadda: 'R S hotel, Metro Station Erragadda, Prem Nagar, Erragadda',
    // Add more locations as needed
  };
  return addresses[location] || '';
}

function getLocationPostalCode(location: string): string {
  const postalCodes: Record<string, string> = {
    madhapur: '500081',
    erragadda: '500018',
    // Add more locations as needed
  };
  return postalCodes[location] || '';
}

function getLocationCoordinates(location: string): { lat: number; lng: number } {
  const coordinates: Record<string, { lat: number; lng: number }> = {
    madhapur: { lat: 17.4400, lng: 78.3920 },
    erragadda: { lat: 17.4482, lng: 78.4376 },
    // Add more locations as needed
  };
  return coordinates[location] || { lat: 0, lng: 0 };
}

function getNearbyAreas(location: string): string[] {
  const areas: Record<string, string[]> = {
    madhapur: ['Madhapur', 'Hitec City', 'Gachibowli', 'Jubilee Hills', 'Kondapur', 'Raidurg'],
    erragadda: ['Erragadda', 'SR Nagar', 'ESI', 'Balkampet', 'Ameerpet', 'Sanjeeva Reddy Nagar'],
    // Add more locations as needed
  };
  return areas[location] || [];
} 