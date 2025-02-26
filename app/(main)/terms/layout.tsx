import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions | OnnRides',
  description: 'Terms and conditions for using OnnRides vehicle rental services. Learn about our rental requirements, booking policies, and more.',
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 