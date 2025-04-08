import { useState } from 'react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface StartTripButtonProps {
  bookingId: string;
  status: string;
}

export default function StartTripButton({ bookingId, status }: StartTripButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStartTrip = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bookings/${bookingId}/start-trip`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to start trip');
      }

      toast.success('Trip started successfully');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start trip');
    } finally {
      setLoading(false);
    }
  };

  if (status !== 'CONFIRMED') {
    return null;
  }

  return (
    <Button
      onClick={handleStartTrip}
      disabled={loading}
      className="w-full md:w-auto"
    >
      {loading ? 'Starting Trip...' : 'Start Trip'}
    </Button>
  );
} 