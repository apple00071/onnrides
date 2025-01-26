import Image from 'next/image';
import Link from 'next/link';

export default function FleetSection() {
  const fleetCategories = [
    {
      title: 'Premium Bikes',
      image: '/bikes/premium.jpg',
      description: 'High-performance bikes for the ultimate riding experience',
      vehicles: ['Royal Enfield Classic 350', 'Harley Davidson Street 750']
    },
    {
      title: 'Sports Bikes',
      image: '/bikes/sports.jpg',
      description: 'Sleek and fast bikes for thrill-seekers',
      vehicles: ['KTM Duke 390', 'Yamaha R15']
    },
    {
      title: 'Scooters',
      image: '/bikes/scooter.jpg',
      description: 'Comfortable and efficient rides for city commuting',
      vehicles: ['Honda Activa', 'TVS Jupiter']
    },
    {
      title: 'Luxury Cars',
      image: '/cars/luxury.jpg',
      description: 'Premium cars for special occasions',
      vehicles: ['Mercedes C-Class', 'BMW 3 Series']
    }
  ];

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-4">Our Fleet</h2>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Choose from our wide range of well-maintained vehicles to suit your needs
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {fleetCategories.map((category, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden group">
              <div className="relative h-48">
                <Image
                  src={category.image}
                  alt={category.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{category.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{category.description}</p>
                <ul className="text-sm text-gray-500 mb-4">
                  {category.vehicles.map((vehicle, idx) => (
                    <li key={idx} className="mb-1">• {vehicle}</li>
                  ))}
                </ul>
                <Link 
                  href="/vehicles" 
                  className="inline-block bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-500 transition-colors text-sm"
                >
                  View All
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 