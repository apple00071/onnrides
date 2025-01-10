'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface FAQItem {
  question: string;
  answer: string;
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: 'What documents do I need to rent a vehicle?',
      answer: 'To rent a vehicle, you need a valid government-issued ID, a valid driving license, and an additional address proof. For outstation rentals, additional documentation may be required.'
    },
    {
      question: 'Is there a security deposit?',
      answer: 'Yes, a security deposit is required for certain vehicles, outstation rentals, and monthly rentals. The deposit amount varies based on the vehicle type and rental duration. The deposit is fully refundable upon safe return of the vehicle.'
    },
    {
      question: 'What are the charges for outstation trips?',
      answer: 'For outstation trips, there is a 20% additional charge on the rental fee. Only Royal Enfield vehicles are allowed for outstation rentals. Additional security deposit and documentation are required.'
    },
    {
      question: 'What are your operating hours?',
      answer: 'We are open 24/7 to serve you better. You can pick up and return vehicles at any time, but please make sure to schedule your pickup and return times in advance.'
    },
    {
      question: 'Do you provide helmets with bike rentals?',
      answer: 'Yes, we provide DOT-certified helmets with all our bike rentals at no additional cost. We prioritize your safety and ensure all our helmets are regularly sanitized.'
    },
    {
      question: 'What is your cancellation policy?',
      answer: 'We offer free cancellation up to 24 hours before the scheduled pickup time. Cancellations within 24 hours of pickup will incur a 50% charge. No refunds are provided for no-shows.'
    },
    {
      question: 'What happens if the vehicle breaks down?',
      answer: 'In case of a breakdown, immediately contact our 24/7 support team. We will either fix the issue or provide a replacement vehicle as soon as possible. All our vehicles are regularly maintained to prevent such incidents.'
    },
    {
      question: 'Do you offer monthly rental plans?',
      answer: 'Yes, we offer monthly rental plans with special rates. Monthly rentals require a security deposit and may have additional documentation requirements. Contact us for detailed monthly rental terms.'
    },
    {
      question: 'What is included in the rental price?',
      answer: 'The rental price includes basic insurance coverage, vehicle maintenance, and 24/7 roadside assistance. Fuel costs and traffic violations are the responsibility of the renter.'
    },
    {
      question: 'How do I extend my rental period?',
      answer: 'To extend your rental period, contact our support team at least 6 hours before your scheduled return time. Extensions are subject to vehicle availability and may require additional payment.'
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <main className="container mx-auto px-4 py-8 mt-16">
      <h1 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h1>
      
      <div className="max-w-3xl mx-auto space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <button
              className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50"
              onClick={() => toggleFAQ(index)}
            >
              <span className="font-semibold text-gray-900">{faq.question}</span>
              <ChevronDownIcon
                className={`w-5 h-5 text-gray-500 transition-transform ${
                  openIndex === index ? 'transform rotate-180' : ''
                }`}
              />
            </button>
            
            <div
              className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                openIndex === index ? 'py-4' : 'max-h-0'
              }`}
            >
              <p className="text-gray-600">{faq.answer}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-600">
          Still have questions? Contact us at
        </p>
        <div className="mt-2 text-[#f26e24]">
          <p>+91 83090 31203</p>
          <p>+91 91824 95481</p>
        </div>
      </div>
    </main>
  );
} 