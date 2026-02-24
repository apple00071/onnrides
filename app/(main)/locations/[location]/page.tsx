import { Metadata } from 'next';
import { query } from '@/lib/db';
import { VehicleCard, Vehicle } from '@/components/ui/VehicleCard';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import LocationStructuredData from '@/components/ui/LocationStructuredData';
import { getLocationAddress, getLocationCoordinates, getLocationPostalCode, getNearbyAreas, getLocationLandmarks, getLocationDescription } from '@/lib/location-utils';

interface LocationPageProps {
  params: {
    location: string;
  };
}

interface VehicleRow {
  id: string;
  name: string;
  type: string;
  images: string | null;
  price_per_hour: number;
  is_available: boolean;
  location: string;
}

// Generate metadata for each location
export async function generateMetadata({ params }: LocationPageProps): Promise<Metadata> {
  const location = decodeURIComponent(params.location);
  const capitalizedLocation = location.charAt(0).toUpperCase() + location.slice(1);
  const areas = getNearbyAreas(location);
  const description = getLocationDescription(location);

  return {
    title: `Bike Rental in ${capitalizedLocation}, Hyderabad | OnnRides`,
    description: description || `Rent bikes in ${capitalizedLocation}, Hyderabad. Choose from Activa, Dio & more. Free delivery, no hidden charges. Book Now & Get 10% Off!`,
    keywords: [
      `bike rental in ${location}`,
      `activa on rent in ${location}`,
      `bike rental near ${location}`,
      `two wheeler for rent in ${location}`,
      `bike rental ${location}`,
      `${location} bike rental`,
      `honda activa rental ${location}`,
      `bike rental service ${location}`,
      `two wheeler rental ${location}`,
      `bike on rent near ${location}`,
      `scooter rental ${location}`,
      `hourly bike rental ${location}`,
      `monthly bike rental ${location}`
    ],
    openGraph: {
      title: `Best Bike Rental in ${capitalizedLocation} | Starting ₹199/day | OnnRides`,
      description: `🏍️ Rent bikes in ${capitalizedLocation} at best prices. Multiple bikes available. Free delivery to ${areas.join(', ')}. Book Now!`,
      images: [
        {
          url: `/images/locations/${location.toLowerCase()}.jpg`,
          width: 1200,
          height: 630,
          alt: `Bike Rental in ${capitalizedLocation} - OnnRides`
        }
      ]
    }
  };
}

export default async function LocationPage({ params }: LocationPageProps) {
  const location = decodeURIComponent(params.location);

  // Get vehicles from database using direct query
  const result = await query(`
    SELECT * FROM vehicles 
    WHERE location = $1 
    AND is_available = true 
    ORDER BY created_at DESC
  `, [location]);

  if (result.rows.length === 0) {
    notFound();
  }

  // Transform the vehicles data to match the Vehicle interface
  const vehicles: Vehicle[] = result.rows.map((row: VehicleRow) => ({
    id: row.id,
    name: row.name,
    description: row.type || '',
    image: row.images ? row.images.split(',')[0] : '',
    price: row.price_per_hour * 24,
    category: row.type || '',
    available: row.is_available ?? true
  }));

  const formattedLocation = location.charAt(0).toUpperCase() + location.slice(1);
  const areas = getNearbyAreas(location);
  const landmarks = getLocationLandmarks(location);
  const description = getLocationDescription(location);

  // Location data for structured data
  const locationData = {
    name: `OnnRides ${formattedLocation}`,
    streetAddress: getLocationAddress(location),
    addressLocality: formattedLocation,
    postalCode: getLocationPostalCode(location),
    latitude: getLocationCoordinates(location).lat,
    longitude: getLocationCoordinates(location).lng,
    areaServed: areas,
    openingHours: {
      opens: '08:00',
      closes: '20:00'
    },
    priceRange: '₹₹',
    telephone: '+91-8247494622'
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Locations', href: '/locations' },
          { label: formattedLocation, href: `/locations/${location}` }
        ]}
        className="mb-8"
      />

      <LocationStructuredData locations={[locationData]} />

      <h1 className="text-3xl font-bold mb-6">
        Bike Rental in {formattedLocation}, Hyderabad
      </h1>

      <div className="prose max-w-none mb-8">
        <p className="text-lg">
          {description || `Looking for reliable bike rentals in ${formattedLocation}, Hyderabad? OnnRides offers a wide selection of well-maintained bikes including Activa, Dio, and Access at competitive rates.`}
          {' '}Whether you need a bike for a few hours or several days, we've got you covered with free delivery to {areas.join(', ')}.
        </p>

        {landmarks.length > 0 && (
          <div className="mt-4">
            <h2 className="text-xl font-semibold mb-3">Popular Landmarks Near Our {formattedLocation} Branch</h2>
            <div className="flex flex-wrap gap-2 mb-6">
              {landmarks.map((landmark, idx) => (
                <span key={idx} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium border border-gray-200">
                  📍 {landmark}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-3">Why Rent from OnnRides in {formattedLocation}?</h2>
          <ul className="list-disc pl-6">
            <li>Starting at just ₹199/day</li>
            <li>Free delivery to your location in {formattedLocation}</li>
            <li>Well-maintained bikes & 24/7 support</li>
            <li>No hidden charges or high deposits</li>
            <li>Conveniently located near {landmarks[0] || 'major transport hubs'}</li>
            <li>Flexible rental duration (Hourly/Daily/Monthly)</li>
          </ul>
        </div>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Available Bikes in {formattedLocation}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
        ))}
      </div>

      <div className="mt-12 prose max-w-none border-t pt-8">
        <h2 className="text-xl font-semibold mb-4">Bike Rental Services in {formattedLocation}</h2>
        <p>
          We provide bike rental services across {formattedLocation} including {areas.join(', ')}.
          Our strategic location near {landmarks.join(', ')} ensures quick delivery and pickup services across the area.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-4">Frequently Asked Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <h3 className="font-semibold text-gray-900">What documents do I need to rent a bike in {formattedLocation}?</h3>
            <p className="text-gray-600">You need a valid government ID (Aadhar/PAN/Passport) and a valid driving license for the vehicle category.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Do you provide helmets?</h3>
            <p className="text-gray-600">Yes, we provide ISI certified helmets with all our bike rentals at no additional cost for your safety.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">What are your working hours in {formattedLocation}?</h3>
            <p className="text-gray-600">We are open from 8 AM to 8 PM, 7 days a week. Support is available 24/7 for active bookings.</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Is there a limit on kilometers?</h3>
            <p className="text-gray-600">Most of our rentals in {formattedLocation} come with a generous daily limit. Please check the specific vehicle details for exact terms.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
