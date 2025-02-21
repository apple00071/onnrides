import Image from 'next/image';

// SVG Icons as components
const FlexibleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 text-[#f26e24]" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
  </svg>
);

const LocationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 text-[#f26e24]" fill="currentColor">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>
);

const InsuranceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 text-[#f26e24]" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
  </svg>
);

const MaintenanceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 text-[#f26e24]" fill="currentColor">
    <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
  </svg>
);

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
      icon: 'flexible',
      title: 'Flexible Rentals',
      description: 'Choose from hourly, daily, or weekly rental options'
    },
    {
      icon: 'maintenance',
      title: 'Well Maintained',
      description: 'All our vehicles undergo regular maintenance checks'
    },
    {
      icon: 'insurance',
      title: 'Insurance Coverage',
      description: 'Comprehensive insurance coverage for worry-free rides'
    },
    {
      icon: 'location',
      title: 'Multiple Locations',
      description: 'Pick up and drop off at convenient locations across the city'
    }
  ];

  const renderIcon = (icon: string) => {
    switch (icon) {
      case 'flexible':
        return <FlexibleIcon />;
      case 'location':
        return <LocationIcon />;
      case 'insurance':
        return <InsuranceIcon />;
      case 'maintenance':
        return <MaintenanceIcon />;
      default:
        return (
          <Image
            src={icon}
            alt="Service icon"
            width={24}
            height={24}
            className="text-[#f26e24]"
          />
        );
    }
  };

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
                    {renderIcon(service.icon)}
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