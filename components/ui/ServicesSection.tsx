import Image from 'next/image';

export default function ServicesSection() {
  const services = [
    {
      icon: '/icons/booking.svg',
      title: 'Easy Booking',
      description: 'Book your ride in just a few clicks through our user-friendly platform'
    },
    {
      icon: '/icons/support.svg',
      title: '24/7 Support',
      description: 'Our dedicated team is available round the clock to assist you'
    },
    {
      icon: '/icons/flexible.svg',
      title: 'Flexible Rentals',
      description: 'Choose from hourly, daily, or weekly rental options'
    },
    {
      icon: '/icons/maintenance.svg',
      title: 'Well Maintained',
      description: 'All our vehicles undergo regular maintenance checks'
    },
    {
      icon: '/icons/insurance.svg',
      title: 'Insurance Coverage',
      description: 'Comprehensive insurance coverage for worry-free rides'
    },
    {
      icon: '/icons/location.svg',
      title: 'Multiple Locations',
      description: 'Pick up and drop off at convenient locations across the city'
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Services We Offer</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Image
                      src={service.icon}
                      alt={service.title}
                      width={24}
                      height={24}
                      className="text-yellow-600"
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                  <p className="text-gray-600">{service.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 