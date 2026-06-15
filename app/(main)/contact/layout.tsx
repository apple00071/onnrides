import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Mister Rides. Visit our Erragadda or Madhapur branches in Hyderabad, call our customer support lines, or send us an online inquiry.',
  keywords: 'contact mister rides, mister rides address, bike rental hyderabad phone number, erragadda branch, madhapur branch',
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
