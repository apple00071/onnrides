'use client';

import { Phone, MessageCircle } from 'lucide-react';

export function NotificationBar() {
  const phoneNumbers = [
    '+91 83090 31203',
    '+91 79934 99752'
  ];
  const whatsappLink = 'https://wa.me/918309031203';

  return (
    <div className="bg-[#f26e24] text-white">
      <div className="max-w-7xl mx-auto py-2 px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center sm:justify-between flex-wrap gap-4">
          {/* Phone Numbers */}
          <div className="flex items-center">
            <Phone className="h-4 w-4 mr-2" />
            <div className="flex items-center">
              <a 
                href={`tel:${phoneNumbers[0].replace(/\s+/g, '')}`}
                className="text-sm font-medium hover:underline whitespace-nowrap"
              >
                {phoneNumbers[0]}
              </a>
              <span className="mx-2 text-white/80">/</span>
              <a 
                href={`tel:${phoneNumbers[1].replace(/\s+/g, '')}`}
                className="text-sm font-medium hover:underline whitespace-nowrap"
              >
                {phoneNumbers[1]}
              </a>
            </div>
          </div>

          {/* Chat Now Button */}
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-[#f26e24] px-4 py-1 rounded-full text-sm font-medium hover:bg-opacity-90 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Chat Now
          </a>
        </div>
      </div>
    </div>
  );
} 