import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | OnnRides - Bike Rental in Hyderabad',
  description: 'Find answers to frequently asked questions about bike and vehicle rentals in Hyderabad with OnnRides. Learn about booking process, documents required, and payment options.',
  keywords: 'bike rental FAQ, Hyderabad vehicle rental questions, OnnRides help, bike rental requirements, scooter rental documents, vehicle rental payment options',
};

// FAQ data structure
const faqs = [
  {
    question: "What documents do I need to rent a vehicle?",
    answer: "To rent a vehicle from OnnRides, you need a valid government-issued photo ID (Aadhar Card, Passport, etc.), a valid driving license for the vehicle category you wish to rent, and an original address proof. For certain vehicles, we may require an additional security deposit."
  },
  {
    question: "How do I book a bike or scooter?",
    answer: "Booking a vehicle with OnnRides is simple. Browse our available vehicles, select your pickup and drop-off dates and times, choose your preferred vehicle, and complete the payment process. You'll receive a confirmation email with your booking details."
  },
  {
    question: "What is the minimum rental duration?",
    answer: "The minimum rental duration is 4 hours for most vehicles. Some premium vehicles may have a minimum rental period of 24 hours."
  },
  {
    question: "Do I need to pay a security deposit?",
    answer: "Yes, a refundable security deposit is required for all rentals. The amount varies based on the vehicle type and rental duration. The deposit is fully refunded after the vehicle is returned in good condition."
  },
  {
    question: "Can I extend my rental period?",
    answer: "Yes, you can extend your rental period by contacting our customer support team at least 3 hours before your scheduled return time. Extension is subject to availability and additional charges will apply based on the extended duration."
  },
  {
    question: "What happens if I return the vehicle late?",
    answer: "Late returns are charged at a higher hourly rate. If you anticipate being late, please contact our customer support team as soon as possible to minimize additional charges."
  },
  {
    question: "How does the fuel policy work?",
    answer: "We provide vehicles with a full tank of fuel, and we expect them to be returned with a full tank. If the vehicle is returned with less fuel, the difference will be charged based on current fuel prices plus a service fee."
  },
  {
    question: "What if the vehicle breaks down?",
    answer: "In case of breakdown, contact our 24/7 customer support immediately. We will provide assistance or a replacement vehicle depending on your location and the nature of the breakdown."
  },
  {
    question: "Do you offer doorstep delivery?",
    answer: "Yes, we offer doorstep delivery and pickup services within Hyderabad city limits for a nominal fee. The service is free for rentals exceeding certain duration or value thresholds."
  },
  {
    question: "What are your operating hours?",
    answer: "Our main rental stations in Madhapur and Erragadda are open from 8:00 AM to 8:00 PM every day. For after-hours pickup or drop-off, please contact our customer support to make special arrangements."
  }
];

export default function FAQPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-center mb-10">Frequently Asked Questions</h1>
      
      {/* FAQ Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map(faq => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
              }
            }))
          })
        }}
      />
      
      <div className="max-w-3xl mx-auto divide-y divide-gray-200">
        {faqs.map((faq, index) => (
          <div key={index} className="py-6">
            <h3 className="text-xl font-semibold text-gray-900">{faq.question}</h3>
            <p className="mt-3 text-gray-600">{faq.answer}</p>
          </div>
        ))}
      </div>
      
      <div className="mt-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
        <p className="mb-6">Our customer support team is here to help you.</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link 
            href="/contact" 
            className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            Contact Us
          </Link>
          <a 
            href="tel:+919876543210" 
            className="border border-primary text-primary px-6 py-3 rounded-lg font-semibold hover:bg-primary hover:text-white transition-colors"
          >
            Call Us
          </a>
        </div>
      </div>
    </div>
  );
} 