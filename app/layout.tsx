import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './fonts.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OnnRides - Vehicle Rental Service',
  description: 'Rent cars and bikes for your next adventure',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
