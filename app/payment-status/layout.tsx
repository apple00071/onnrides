import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payment Status | OnnRides',
  description: 'Check the status of your payment',
};

export default function PaymentStatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 