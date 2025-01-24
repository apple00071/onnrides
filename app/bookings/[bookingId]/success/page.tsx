'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

interface SuccessPageProps {
  params: {
    bookingId: string;
  };
}

export default function SuccessPage({ params }: SuccessPageProps) {
  const { bookingId } = params;
  const router = useRouter();
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/auth/login');
    },
  });

  return (
    <div className="min-h-screen bg-[#fff8f0] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
          <CardDescription>Your booking has been confirmed</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Thank you for your payment. Your booking (#{bookingId}) has been confirmed.
            We have sent a confirmation email with the booking details.
          </p>
          <div className="text-sm text-gray-500">
            You can view your booking details and manage your bookings in your account dashboard.
          </div>
        </CardContent>
        <CardFooter className="flex justify-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/bookings')}
          >
            View Bookings
          </Button>
          <Button
            onClick={() => router.push('/')}
            className="bg-[#f26e24] hover:bg-[#e05d13] text-white"
          >
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 