import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rent Bikes & Scooters in Hyderabad | OnnRides Vehicle Rental',
  description: 'Choose from our range of bikes, scooters, and vehicles for rent in Hyderabad. Hourly and daily rental options with best rates in Madhapur and Erragadda.',
  keywords: 'Hyderabad bike rentals, rent Activa, scooter rentals Hyderabad, hourly bike rentals, daily vehicle rentals, Madhapur vehicle rental, Erragadda bike rental',
};

export default function VehiclesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 