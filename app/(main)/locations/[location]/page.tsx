import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import LocationStructuredData from '@/components/ui/LocationStructuredData';
import { VehicleCard, Vehicle } from '@/components/ui/VehicleCard';
import { getLocationAddress, getLocationCoordinates, getLocationPostalCode, getNearbyAreas } from '@/lib/location-utils';

interface LocationPageProps {
  params: {
    location: string;
  };
}

// Initialize Prisma client
const prisma = new PrismaClient();

// Generate metadata for each location
export async function generateMetadata({ params }: LocationPageProps): Promise<Metadata> {
  const location = decodeURIComponent(params.location);
  const formattedLocation = location.charAt(0).toUpperCase() + location.slice(1);
  const areas = getNearbyAreas(location);

  return {
    title: `Best Bike Rental in ${formattedLocation} Hyderabad | Activa on Rent | OnnRides`,
    description: `Rent bikes in ${formattedLocation}, Hyderabad starting ₹199. ✓Activa ✓Dio ✓Access available. Free delivery to ${areas.join(', ')}. Book Now & Get 10% Off!`,
    keywords: [
      `bike rental in ${formattedLocation.toLowerCase()}`,
      `bike for rent in ${formattedLocation.toLowerCase()}`,
      `activa on rent in ${formattedLocation.toLowerCase()}`,
      `two wheeler rental ${formattedLocation.toLowerCase()}`,
      `bike rent near ${formattedLocation.toLowerCase()}`,
      'hourly bike rental',
      'monthly bike rental',
      'cheap bike rental',
      'OnnRides bike rental'
    ],
    openGraph: {
      title: `Best Bike Rental in ${formattedLocation} | Starting ₹199/day | OnnRides`,
      description: `🏍️ Rent bikes in ${formattedLocation} at best prices. Multiple bikes available. Free delivery to ${areas.join(', ')}. Book Now!`,
      images: [
        {
          url: `/images/locations/${location.toLowerCase()}.jpg`,
          width: 1200,
          height: 630,
          alt: `Bike Rental in ${formattedLocation} - OnnRides`
        }
      ]
    }
  };
}

export default async function LocationPage({ params }: LocationPageProps) {
  const location = decodeURIComponent(params.location).toLowerCase();
  
  // Get vehicles available in this location using Prisma
  const vehicles = await prisma.vehicles.findMany({
    where: {
      OR: [
        { location: { contains: location.toLowerCase() } },
        { location: { contains: location.toUpperCase() } }
      ],
      is_available: true
    }
  });

  if (vehicles.length === 0) {
    notFound();
  }

  const formattedLocation = location.charAt(0).toUpperCase() + location.slice(1);
  const areas = getNearbyAreas(location);
  
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

  // Transform Prisma vehicle data to match VehicleCard component interface
  const transformedVehicles: Vehicle[] = vehicles.map((vehicle) => ({
    id: vehicle.id,
    name: vehicle.name,
    description: vehicle.type || '',
    image: vehicle.images.split(',')[0] || '',
    price: vehicle.price_per_hour * 24,
    category: vehicle.type || '',
    available: vehicle.is_available ?? true
  }));

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
          Looking for reliable bike rentals in {formattedLocation}, Hyderabad? OnnRides offers a wide selection of 
          well-maintained bikes including Activa, Dio, and Access at competitive rates. Whether you need a bike 
          for a few hours or several days, we've got you covered with free delivery to {areas.join(', ')}.
        </p>
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-3">Why Rent from OnnRides in {formattedLocation}?</h2>
          <ul className="list-disc pl-6">
            <li>Starting at just ₹199/day</li>
            <li>Free delivery to your location</li>
            <li>Well-maintained bikes</li>
            <li>No hidden charges</li>
            <li>24/7 roadside assistance</li>
            <li>Flexible rental duration</li>
          </ul>
        </div>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Available Bikes in {formattedLocation}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {transformedVehicles.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
        ))}
      </div>

      <div className="mt-8 prose max-w-none">
        <h2 className="text-xl font-semibold mb-4">Popular Areas We Serve in {formattedLocation}</h2>
        <p>
          We provide bike rental services across {formattedLocation} including {areas.join(', ')}. 
          Our strategic location ensures quick delivery and pickup services across the area.
        </p>
        
        <h2 className="text-xl font-semibold mt-6 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">What documents do I need to rent a bike in {formattedLocation}?</h3>
            <p>You need a valid government ID (Aadhar/PAN/Passport) and a valid driving license.</p>
          </div>
          <div>
            <h3 className="font-medium">Do you provide helmets?</h3>
            <p>Yes, we provide ISI certified helmets with all our bike rentals at no additional cost.</p>
          </div>
          <div>
            <h3 className="font-medium">What are your working hours in {formattedLocation}?</h3>
            <p>We are open from 8 AM to 8 PM, 7 days a week. 24/7 support available for existing rentals.</p>
          </div>
        </div>
      </div>
    </div>
  );
} 