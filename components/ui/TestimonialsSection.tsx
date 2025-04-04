'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Rahul Sharma',
      image: '/testimonials/user1.jpg',
      role: 'Business Professional',
      comment: 'Excellent service! The bike was in perfect condition and the booking process was seamless.',
      rating: 5
    },
    {
      name: 'Priya Patel',
      image: '/testimonials/user2.jpg',
      role: 'Travel Enthusiast',
      comment: 'Great experience with OnnRides. The staff was very helpful and the prices are reasonable.',
      rating: 5
    },
    {
      name: 'Arun Kumar',
      image: '/testimonials/user3.jpg',
      role: 'Student',
      comment: 'Perfect for weekend trips. Will definitely use their service again!',
      rating: 4
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [testimonials.length]);

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">What Our Customers Say</h2>
        
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Testimonial Cards */}
            <div className="overflow-hidden">
              <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="w-full flex-shrink-0">
                    <div className="bg-white rounded-lg shadow-sm p-8 mx-4">
                      <div className="flex items-center mb-6">
                        <div className="relative w-16 h-16 rounded-full overflow-hidden">
                          <Image
                            src={testimonial.image}
                            alt={testimonial.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="ml-4">
                          <h3 className="font-semibold text-lg">{testimonial.name}</h3>
                          <p className="text-gray-600 text-sm">{testimonial.role}</p>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-4">{testimonial.comment}</p>
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-5 h-5 ${i < testimonial.rating ? 'fill-current' : 'stroke-current fill-none'}`}
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Dots */}
            <div className="flex justify-center mt-8">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`w-3 h-3 rounded-full mx-1 ${
                    currentIndex === index ? 'bg-yellow-400' : 'bg-gray-300'
                  }`}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 