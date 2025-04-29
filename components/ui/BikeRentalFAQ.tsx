import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './accordion';

interface FAQ {
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    question: "What documents do I need to rent a bike in Hyderabad?",
    answer: "To rent a bike, you need: 1) A valid government-issued photo ID (Aadhar/PAN/Passport), 2) A valid two-wheeler driving license, 3) A security deposit (fully refundable). For monthly rentals, we may require additional address proof."
  },
  {
    question: "How much does it cost to rent a bike in Hyderabad?",
    answer: "Our bike rental rates start from ₹199/day for standard models like Activa. Hourly rentals start from ₹49. Weekly and monthly rentals come with special discounted rates. All prices include fuel, maintenance, and insurance."
  },
  {
    question: "Do you provide helmets with bike rentals?",
    answer: "Yes, we provide ISI-certified helmets with all our bike rentals at no additional cost. We sanitize all helmets after each use for your safety."
  },
  {
    question: "What is your cancellation policy?",
    answer: "Free cancellation up to 24 hours before pickup. Cancellations within 24 hours of pickup may incur a 50% charge. No refunds for no-shows or cancellations after pickup time."
  },
  {
    question: "Which areas in Hyderabad do you serve?",
    answer: "We provide bike rental services across Hyderabad including Madhapur, Gachibowli, Hitec City, Kondapur, Jubilee Hills, Erragadda, Ameerpet, and SR Nagar. Free delivery available in these areas."
  },
  {
    question: "What happens if the bike breaks down?",
    answer: "We provide 24/7 roadside assistance. In case of any breakdown, call our support number and we'll either fix the issue or provide a replacement bike immediately."
  },
  {
    question: "Can I extend my bike rental period?",
    answer: "Yes, you can extend your rental period by contacting our support team at least 3 hours before your scheduled return time. Extension is subject to availability."
  },
  {
    question: "What is included in the rental price?",
    answer: "Our rental price includes bike insurance, maintenance, 24/7 roadside assistance, and helmet. Fuel costs are not included and the bike should be returned with the same fuel level as provided."
  }
];

export function BikeRentalFAQ() {
  return (
    <>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent>{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* FAQ Schema Markup */}
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
    </>
  );
} 