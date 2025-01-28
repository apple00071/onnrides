'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FaFacebook, FaTwitter, FaInstagram } from 'react-icons/fa';

interface MenuItem {
  title: string;
  links: {
    text: string;
    url: string;
  }[];
}

interface FooterProps {
  logo?: {
    url: string;
    src: string;
    alt: string;
    title: string;
  };
  tagline?: string;
  menuItems?: MenuItem[];
  copyright?: string;
  bottomLinks?: {
    text: string;
    url: string;
  }[];
}

export function Footer({
  logo = {
    src: "/logo.png",
    alt: "OnnRides",
    title: "OnnRides",
    url: "/",
  },
  tagline = "Your trusted partner for vehicle rentals.",
  menuItems = [
    {
      title: "Quick Links",
      links: [
        { text: "Home", url: "/" },
        { text: "Vehicles", url: "/vehicles" },
        { text: "Bookings", url: "/bookings" },
        { text: "Profile", url: "/profile" },
      ],
    },
    {
      title: "Vehicle Types",
      links: [
        { text: "Cars", url: "/vehicles?type=car" },
        { text: "Bikes", url: "/vehicles?type=bike" },
        { text: "Scooters", url: "/vehicles?type=scooter" },
      ],
    },
    {
      title: "Support",
      links: [
        { text: "Contact Us", url: "/contact" },
        { text: "FAQ", url: "/faq" },
        { text: "Help Center", url: "/help" },
      ],
    },
    {
      title: "Connect",
      links: [
        { text: "Facebook", url: "https://facebook.com" },
        { text: "Twitter", url: "https://twitter.com" },
        { text: "Instagram", url: "https://instagram.com" },
      ],
    },
  ],
  copyright = "© 2024 OnnRides. All rights reserved.",
  bottomLinks = [
    { text: "Terms of Service", url: "/terms" },
    { text: "Privacy Policy", url: "/privacy" },
    { text: "Refund Policy", url: "/refund" },
  ],
}: FooterProps) {
  return (
    <footer className="bg-background border-t">
      <div className="container px-4 mx-auto py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href={logo.url} className="flex items-center gap-2">
              <Image
                src={logo.src}
                alt={logo.alt}
                width={40}
                height={40}
                className="w-10 h-10"
              />
              <span className="text-xl font-semibold text-primary">{logo.title}</span>
            </Link>
            <p className="mt-4 text-muted-foreground max-w-sm">{tagline}</p>
            <div className="mt-6 flex gap-4">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <FaFacebook size={24} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <FaTwitter size={24} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <FaInstagram size={24} />
              </a>
            </div>
          </div>
          {menuItems.map((section, sectionIdx) => (
            <div key={sectionIdx} className="col-span-1">
              <h3 className="font-bold text-foreground mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <Link 
                      href={link.url}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>{copyright}</p>
          <ul className="flex flex-wrap gap-4 md:gap-8">
            {bottomLinks.map((link, linkIdx) => (
              <li key={linkIdx}>
                <Link 
                  href={link.url}
                  className="hover:text-primary transition-colors"
                >
                  {link.text}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
} 