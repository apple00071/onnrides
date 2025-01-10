import logger from '@/lib/logger';
'use client';



import Image from 'next/image';
import toast from 'react-hot-toast';

interface BookingDetails {
  id: string;
  vehicle_name: string;
  user_name: string;
  pickup_datetime: string;
  dropoff_datetime: string;
  pickup_location: string;
  drop_location: string;
  amount: number;
}

export default function PaymentPage() {
  
  
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string>('');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);

  useEffect(() => {
    
    

    if (!bookingId || !amount) {
      toast.error('Invalid payment details');
      router.push('/bookings');
      return;
    }

    
        

        
        logger.debug('Payment initiation response:', data);

        if (!response.ok) {
          throw new Error(data.error || 'Failed to initiate payment');
        }

        if (!data.qrCode) {
          throw new Error('No QR code received from server');
        }

        setQrCode(data.qrCode);
        setPaymentRef(data.paymentRef);
        setBookingDetails(data.bookingDetails);
      } catch (error) {
        logger.error('Payment initiation error:', error);
        toast.error('Failed to generate payment QR code');
        router.push('/bookings');
      } finally {
        setLoading(false);
      }
    };

    initiatePayment();
  }, [searchParams, router]);

  
      

      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm payment');
      }

      toast.success('Payment successful! Booking confirmed.');
      router.push(`/bookings?success=true&bookingNumber=${data.bookingNumber}`);
    } catch (error) {
      toast.error('Failed to confirm payment');
      logger.error('Payment confirmation error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!bookingDetails || !qrCode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load payment details</p>
          <button
            onClick={() => router.push('/bookings')}
            className="text-primary hover:underline"
          >
            Return to Bookings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-8">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              Complete Your Payment
            </h2>

            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Booking Details
              </h3>
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Vehicle</span>
                  <span className="font-medium">{bookingDetails.vehicle_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Pickup</span>
                  <span className="font-medium">
                    {new Date(bookingDetails.pickup_datetime).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Drop-off</span>
                  <span className="font-medium">
                    {new Date(bookingDetails.dropoff_datetime).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Amount</span>
                  <span className="font-medium">₹{bookingDetails.amount}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center mb-8">
              <div className="mb-4">
                <p className="text-sm text-gray-600 text-center mb-4">
                  Scan the QR code to complete your payment
                </p>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <Image
                    src={qrCode}
                    alt="Payment QR Code"
                    width={200}
                    height={200}
                    className="mx-auto"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-6">
                Payment Reference: {paymentRef}
              </p>
            </div>

            <div className="flex flex-col items-center">
              <button
                onClick={handlePaymentConfirmation}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 bg-primary text-white font-semibold rounded-md shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Confirm Payment'}
              </button>
              <p className="mt-4 text-sm text-gray-600">
                Click the button above after completing the payment
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 