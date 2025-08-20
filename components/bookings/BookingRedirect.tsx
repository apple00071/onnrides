import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

export function BookingRedirect() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    async function handleRedirect() {
      // Only proceed if we're authenticated
      if (status === 'authenticated' && session?.user) {
        // Check for pending booking in localStorage
        const pendingBookingStr = localStorage.getItem('pendingBooking');
        if (!pendingBookingStr) return;

        try {
          const pendingBooking = JSON.parse(pendingBookingStr);
          
          // Check vehicle availability
          const response = await fetch('/api/vehicles/check-availability', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              vehicleId: pendingBooking.vehicleId,
              location: pendingBooking.location,
              startDate: pendingBooking.startDate,
              endDate: pendingBooking.endDate
            }),
          });

          const data = await response.json();

          // Clear the pending booking
          localStorage.removeItem('pendingBooking');

          if (data.available) {
            // If vehicle is available, redirect back to the booking page
            router.push(pendingBooking.returnUrl);
          } else {
            // If vehicle is not available, show message and redirect to home
            toast.error('Sorry, this vehicle is no longer available for the selected dates. Please try different dates or choose another vehicle.');
            router.push('/vehicles');
          }
        } catch (error) {
          console.error('Error handling booking redirect:', error);
          toast.error('Something went wrong. Please try booking again.');
          router.push('/vehicles');
        }
      }
    }

    handleRedirect();
  }, [status, session, router]);

  return null; // This component doesn't render anything
} 