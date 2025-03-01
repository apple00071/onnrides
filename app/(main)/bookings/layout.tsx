import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Bookings | OnnRides - Bike Rental Service Hyderabad',
  description: 'Manage your bike and vehicle rental bookings with OnnRides. View booking details, check status, and manage your reservations in Hyderabad.',
  keywords: 'bike booking Hyderabad, manage vehicle rental, two-wheeler booking, vehicle rental tracking, OnnRides bookings',
};

export default function BookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 