import Image from 'next/image';

interface Service {
  title: string;
  description: string;
  icon: string;
}

const services: Service[] = [
  {
    title: "24/7 Customer Support",
    description: "Round-the-clock assistance for all your rental needs and queries.",
    icon: "/icons/support.svg"
  },
  {
    title: "Flexible Rentals",
    description: "Choose from hourly, daily, weekly, or monthly rental options.",
    icon: "/icons/calendar.svg"
  },
  {
    title: "Wide Vehicle Selection",
    description: "From economy cars to luxury vehicles, find the perfect ride for your needs.",
    icon: "/icons/car.svg"
  },
  {
    title: "Doorstep Delivery",
    description: "Get your rental vehicle delivered right to your location.",
    icon: "/icons/delivery.svg"
  },
  {
    title: "Insurance Coverage",
    description: "Comprehensive insurance options for worry-free rentals.",
    icon: "/icons/shield.svg"
  },
  {
    title: "Easy Booking Process",
    description: "Simple and quick online booking system with instant confirmation.",
    icon: "/icons/booking.svg"
  }
];

export default function ServicesSection() {
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