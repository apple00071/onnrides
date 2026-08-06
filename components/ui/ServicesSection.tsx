'use client';

import { Clock, PhoneCall, Calendar, Settings, Shield, MapPin, Sparkles } from 'lucide-react';

const services = [
  {
    icon: Clock,
    title: 'Instant Online Booking',
    description: 'Reserve your favorite bike in less than 60 seconds with simple OTP verification.',
    gradient: 'from-[#f26e24] to-amber-500',
    bgColor: 'bg-orange-50/70',
    borderColor: 'border-orange-100'
  },
  {
    icon: PhoneCall,
    title: '24/7 Roadside Assistance',
    description: 'Dedicated helpline & breakdown support anywhere across Hyderabad.',
    gradient: 'from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-50/70',
    borderColor: 'border-blue-100'
  },
  {
    icon: Calendar,
    title: 'Zero Deposit Options',
    description: 'Flexible daily, weekly, or monthly rentals without blocking high security deposits.',
    gradient: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-50/70',
    borderColor: 'border-emerald-100'
  },
  {
    icon: Settings,
    title: 'Sanitized & Serviced Rides',
    description: 'Every vehicle is multi-point inspected, disinfected, and safety checked before dispatch.',
    gradient: 'from-purple-500 to-violet-600',
    bgColor: 'bg-purple-50/70',
    borderColor: 'border-purple-100'
  },
  {
    icon: Shield,
    title: 'Free Helmets & Insurance',
    description: 'Complimentary clean ISI-marked helmet and comprehensive insurance included.',
    gradient: 'from-pink-500 to-rose-600',
    bgColor: 'bg-pink-50/70',
    borderColor: 'border-pink-100'
  },
  {
    icon: MapPin,
    title: 'Madhapur & Erragadda Hubs',
    description: 'Convenient pickup locations close to metro stations with doorstep delivery options.',
    gradient: 'from-amber-500 to-yellow-600',
    bgColor: 'bg-amber-50/70',
    borderColor: 'border-amber-100'
  }
];

export default function ServicesSection() {
  return (
    <section className="py-20 bg-white relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-[#f26e24] bg-orange-50 rounded-full border border-orange-200/80 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Why Choose Mister Rides
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
            Premium Features <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f26e24] to-amber-500">Made For You</span>
          </h2>
          <p className="text-gray-600 text-base mt-3">
            Experience hassle-free two-wheeler rentals in Hyderabad with complete safety, transparency, and top-tier convenience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className={`group relative rounded-2xl p-7 border ${service.borderColor} ${service.bgColor} backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:bg-white`}
            >
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.gradient} text-white flex items-center justify-center shadow-md mb-6 transform group-hover:scale-110 transition-transform`}>
                    <service.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#f26e24] transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
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
