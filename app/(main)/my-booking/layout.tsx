import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Current Booking | Mister Rides - Bike Rental Service Hyderabad',
  description: 'View your current bike or vehicle rental booking details. Check pickup and return status for your rental in Hyderabad.',
  keywords: 'current booking, bike rental status, Hyderabad vehicle booking, track bike rental, Mister Rides booking, rental booking details',
};

export default function MyBookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 
