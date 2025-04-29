import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { PrismaClient } from '@prisma/client';
import { VehicleCard, Vehicle } from '@/components/ui/VehicleCard';
import { Button } from '@/components/ui/button';
import { BikeRentalFAQ } from '@/components/ui/BikeRentalFAQ';

// Initialize Prisma client
const prisma = new PrismaClient();

export const metadata: Metadata = {
  title: 'Bike Rental in Hyderabad | Activa on Rent | Honda Dio | OnnRides',
  description: 'Rent bikes in Hyderabad starting ₹199/day. Choose from Activa, Dio, Access & more. Multiple locations, free delivery, no hidden charges. Book Now & Get 10% Off!',
  keywords: [
    'bike rental in hyderabad',
    'bike for rent in hyderabad',
    'activa on rent in hyderabad',
    'bike rental near me',
    'two wheeler for rent in hyderabad',
    'bike rent in madhapur',
    'bike rental gachibowli',
    'erragadda bike rental',
    'honda activa rental hyderabad',
    'bike rental service hyderabad',
    'two wheeler rental hyderabad',
    'bike on rent near me',
    'scooter rental hyderabad',
    'hourly bike rental hyderabad',
    'monthly bike rental hyderabad'
  ],
  openGraph: {
    title: 'Best Bike Rental in Hyderabad | Starting ₹199/day',
    description: '🏍️ Rent Activa, Dio & more in Hyderabad. Free delivery, no hidden charges. Book Now!',
    images: [
      {
        url: '/images/bike-rental-hyderabad.jpg',
        width: 1200,
        height: 630,
        alt: 'Bike Rental in Hyderabad - OnnRides'
      }
    ]
  }
};

export default async function BikesPage() {
  // Get bikes from database using Prisma
  const dbBikes = await prisma.vehicles.findMany({
    where: {
      type: 'bike',
      is_available: true
    },
    orderBy: {
      created_at: 'desc'
    },
    take: 6
  });

  // Transform the bikes data to match the Vehicle interface
  const bikes: Vehicle[] = dbBikes.map(bike => ({
    id: bike.id,
    name: bike.name,
    description: bike.type || '',
    image: bike.images.split(',')[0] || '',
    price: bike.price_per_hour * 24,
    category: bike.type || '',
    available: bike.is_available ?? true
  }));

  const locations = [
    'Madhapur',
    'Gachibowli',
    'Hitec City',
    'Kondapur',
    'Jubilee Hills',
    'Erragadda',
    'Ameerpet',
    'SR Nagar'
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="relative h-[500px] rounded-2xl overflow-hidden mb-12">
        <Image
          src="/images/bike-rental-hero.jpg"
          alt="Bike Rental in Hyderabad"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white text-center p-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Bike Rental in Hyderabad
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl">
            Rent bikes starting at ₹199/day. Free delivery, no hidden charges.
          </p>
          <Button size="lg" asChild>
            <Link href="/vehicles?category=bike">View Available Bikes</Link>
          </Button>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-8 text-center">
          Why Choose OnnRides for Bike Rental?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Affordable Rates</h3>
            <p>Starting at just ₹199/day with no hidden charges.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Free Delivery</h3>
            <p>Free pickup and drop-off at your preferred location.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Well-Maintained Bikes</h3>
            <p>Regular servicing and sanitization of all bikes.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3">24/7 Support</h3>
            <p>Round-the-clock assistance for all your needs.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Flexible Duration</h3>
            <p>Rent by hour, day, week, or month as per your need.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Multiple Locations</h3>
            <p>Convenient pickup points across Hyderabad.</p>
          </div>
        </div>
      </section>

      {/* Popular Bikes Section */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-8">Popular Bikes for Rent</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bikes.map((bike) => (
            <VehicleCard key={bike.id} vehicle={bike} />
          ))}
        </div>
        <div className="text-center mt-8">
          <Button asChild>
            <Link href="/vehicles?category=bike">View All Bikes</Link>
          </Button>
        </div>
      </section>

      {/* Locations Section */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-8">Service Locations in Hyderabad</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {locations.map((location) => (
            <Link
              key={location}
              href={`/locations/${location.toLowerCase()}`}
              className="bg-white p-4 rounded-lg shadow-sm text-center hover:shadow-md transition-shadow"
            >
              {location}
            </Link>
          ))}
        </div>
      </section>

      {/* Process Section */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-8 text-center">
          How to Rent a Bike
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-4">1</div>
            <h3 className="text-xl font-semibold mb-2">Choose Your Bike</h3>
            <p>Browse our collection and select your preferred bike</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-4">2</div>
            <h3 className="text-xl font-semibold mb-2">Book Online</h3>
            <p>Select duration and make secure payment</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-4">3</div>
            <h3 className="text-xl font-semibold mb-2">Get Your Bike</h3>
            <p>We'll deliver the bike to your location</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-8">Frequently Asked Questions</h2>
        <BikeRentalFAQ />
      </section>

      {/* SEO Content */}
      <section className="prose max-w-none mb-12">
        <h2>Bike Rental in Hyderabad - Your Ultimate Guide</h2>
        <p>
          Looking for reliable bike rental services in Hyderabad? OnnRides offers a wide selection of 
          well-maintained bikes including Honda Activa, Honda Dio, and Suzuki Access at competitive rates. 
          Whether you need a bike for a few hours or several months, we've got you covered with convenient 
          pickup locations across Hyderabad including Madhapur, Gachibowli, Hitec City, and Erragadda.
        </p>
        <h3>Types of Bikes Available for Rent</h3>
        <ul>
          <li>Honda Activa 6G</li>
          <li>Honda Dio</li>
          <li>Suzuki Access 125</li>
          <li>TVS Jupiter</li>
          <li>And more...</li>
        </ul>
        <h3>Rental Duration Options</h3>
        <ul>
          <li>Hourly rental (minimum 4 hours)</li>
          <li>Daily rental</li>
          <li>Weekly rental (at discounted rates)</li>
          <li>Monthly rental (best value)</li>
        </ul>
        <p>
          All our bikes come with insurance coverage and 24/7 roadside assistance. We also provide 
          complimentary helmets and maintain high sanitization standards for your safety.
        </p>
      </section>
    </div>
  );
} 