import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rent Bikes in Hyderabad | OnnRides Bike Rental',
  description: 'Choose from our range of bikes and scooters for rent in Hyderabad. Hourly and daily rental options with best rates in Madhapur and Erragadda.',
  keywords: 'Hyderabad bike rentals, rent Activa, scooter rentals Hyderabad, hourly bike rentals, daily bike rentals, Madhapur bike rental, Erragadda bike rental',
};

export default function VehiclesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 