import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HeroSection from '@/components/ui/HeroSection';
import LocationStructuredData from '@/components/ui/LocationStructuredData';
import { getLocationAddress, getLocationCoordinates, getLocationPostalCode, getNearbyAreas, getLocationLandmarks, getLocationDescription } from '@/lib/location-utils';

interface LocationPageProps {
  params: {
    location: string;
  };
}

// Generate metadata for each location
export async function generateMetadata({ params }: LocationPageProps): Promise<Metadata> {
  const location = decodeURIComponent(params.location).toLowerCase();
  const capitalizedLocation = location.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const areas = getNearbyAreas(location);
  const description = getLocationDescription(location);

  return {
    title: `Bike Rental in ${capitalizedLocation}, Hyderabad`,
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
      title: `Best Bike Rental in ${capitalizedLocation} | Starting ₹199/day | Mister Rides`,
      description: `🏍️ Rent bikes in ${capitalizedLocation} at best prices. Multiple bikes available. Free delivery to ${areas.join(', ')}. Book Now!`,
      images: [
        {
          url: `/images/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: `Bike Rental in ${capitalizedLocation} - Mister Rides`
        }
      ]
    }
  };
}

const VALID_LOCATIONS = [
  'madhapur',
  'gachibowli',
  'hitec-city',
  'kondapur',
  'jubilee-hills',
  'erragadda',
  'ameerpet',
  'sr-nagar'
];

export default function LocationPage({ params }: LocationPageProps) {
  const location = decodeURIComponent(params.location).toLowerCase();

  if (!VALID_LOCATIONS.includes(location)) {
    notFound();
  }

  const formattedLocation = location.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const areas = getNearbyAreas(location);
  const landmarks = getLocationLandmarks(location);
  const description = getLocationDescription(location);

  // Location data for structured data
  const locationData = {
    name: `Mister Rides ${formattedLocation}`,
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
    telephone: '+91-8309031203'
  };

  return (
    <>
      <LocationStructuredData locations={[locationData]} />

      {/* Hero Section — same search form as homepage */}
      <HeroSection />

      {/* Location-specific SEO content below the hero */}
      <div className="container mx-auto px-4 py-12 max-w-5xl">

        {/* Intro */}
        <section className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Bike Rental in {formattedLocation}, Hyderabad
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            {description || `Looking for reliable bike rentals in ${formattedLocation}, Hyderabad? Mister Rides offers a wide selection of well-maintained bikes including Activa, Dio, and Access at competitive rates.`}
            {' '}Whether you need a bike for a few hours or several days, we&apos;ve got you covered with free delivery to {areas.join(', ')}.
          </p>
        </section>

        {/* Landmarks */}
        {landmarks.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Popular Landmarks Near Our {formattedLocation} Branch
            </h2>
            <div className="flex flex-wrap gap-2">
              {landmarks.map((landmark, idx) => (
                <span key={idx} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-sm font-medium border border-gray-200">
                  📍 {landmark}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Why choose us */}
        <section className="mb-10 bg-orange-50/50 border border-orange-100 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Why Rent from Mister Rides in {formattedLocation}?
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              `Starting at just ₹199/day`,
              `Free delivery to your location in ${formattedLocation}`,
              `Well-maintained bikes & 24/7 support`,
              `No hidden charges or high deposits`,
              `Conveniently located near ${landmarks[0] || 'major transport hubs'}`,
              `Flexible rental duration (Hourly/Daily/Monthly)`,
            ].map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
                <span className="text-[#f26e24] mt-0.5">✓</span>
                {point}
              </li>
            ))}
          </ul>
        </section>

        {/* Area coverage */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            Bike Rental Services in {formattedLocation}
          </h2>
          <p className="text-gray-600">
            We provide bike rental services across {formattedLocation} including {areas.join(', ')}.
            {landmarks.length > 0 && ` Our strategic location near ${landmarks.slice(0, 2).join(' and ')} ensures quick delivery and pickup services across the area.`}
          </p>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Frequently Asked Questions — {formattedLocation}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                q: `What documents do I need to rent a bike in ${formattedLocation}?`,
                a: `You need a valid government ID (Aadhar/PAN/Passport) and a valid driving license for the vehicle category.`
              },
              {
                q: `Do you provide helmets?`,
                a: `Yes, we provide ISI certified helmets with all our bike rentals at no additional cost for your safety.`
              },
              {
                q: `What are your working hours in ${formattedLocation}?`,
                a: `We are open from 8 AM to 8 PM, 7 days a week. Support is available 24/7 for active bookings.`
              },
              {
                q: `Is there a limit on kilometers?`,
                a: `Most of our rentals in ${formattedLocation} come with a generous daily limit. Please check the specific vehicle details for exact terms.`
              },
            ].map(({ q, a }, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-5 bg-white shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">{q}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
