'use client';

import { Clock, PhoneCall, Calendar, Settings, Shield, MapPin } from 'lucide-react';

const services = [
  {
    icon: Clock,
    title: 'Easy Booking',
    description: 'Book your ride in just a few clicks through our user-friendly platform',
    color: 'bg-orange-50'
  },
  {
    icon: PhoneCall,
    title: '24/7 Support',
    description: 'Our dedicated team is available round the clock to assist you',
    color: 'bg-blue-50'
  },
  {
    icon: Calendar,
    title: 'Flexible Rentals',
    description: 'Choose from hourly, daily, or weekly rental options',
    color: 'bg-green-50'
  },
  {
    icon: Settings,
    title: 'Well Maintained',
    description: 'All our vehicles undergo regular maintenance checks',
    color: 'bg-purple-50'
  },
  {
    icon: Shield,
    title: 'Insurance Coverage',
    description: 'Comprehensive insurance coverage for worry-free rides',
    color: 'bg-pink-50'
  },
  {
    icon: MapPin,
    title: 'Multiple Locations',
    description: 'Pick up and drop off at convenient locations across the city',
    color: 'bg-yellow-50'
  }
];

export default function ServicesSection() {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Services We Offer</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Experience hassle-free bike rentals with our comprehensive services designed for your convenience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className={`${service.color} rounded-2xl p-6 transition-transform duration-300 hover:scale-105`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <service.icon className="w-8 h-8 text-[#f26e24]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {service.title}
                  </h3>
                  <p className="text-gray-600">
                    {service.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 