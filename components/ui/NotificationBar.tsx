'use client';

import { usePathname } from 'next/navigation';
import { Phone, MessageCircle } from 'lucide-react';

export function NotificationBar() {
  const pathname = usePathname();
  
  // Hide notification bar on admin routes
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const phoneNumbers = [
    '+91 83090 31203',
    '+91 79934 99752'
  ];
  const whatsappLink = 'https://wa.me/918309031203';

  return (
    <div className="bg-[#f26e24] text-white">
      <div className="max-w-7xl mx-auto py-2 px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Phone Numbers */}
          <div className="flex items-center min-w-0">
            <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
            <div className="flex items-center overflow-x-auto scrollbar-none">
              <a 
                href={`tel:${phoneNumbers[0].replace(/\s+/g, '')}`}
                className="text-xs sm:text-sm font-medium hover:underline whitespace-nowrap"
              >
                {phoneNumbers[0]}
              </a>
              <span className="mx-1 sm:mx-2 text-white/80">/</span>
              <a 
                href={`tel:${phoneNumbers[1].replace(/\s+/g, '')}`}
                className="text-xs sm:text-sm font-medium hover:underline whitespace-nowrap"
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
            className="inline-flex items-center gap-1 sm:gap-2 bg-white text-[#f26e24] px-2 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-medium hover:bg-opacity-90 transition-colors ml-2 flex-shrink-0"
          >
            <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
            Chat Now
          </a>
        </div>
      </div>
    </div>
  );
} 