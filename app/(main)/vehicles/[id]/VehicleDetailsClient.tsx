import logger from '@/lib/logger';
'use client';

import VehicleDetails from './VehicleDetails';






type Props = {
  params: {
    id: string;
  };
};

export default function VehicleDetailsClient({ params }: Props) {
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  
  

  useEffect(() => {
    
        if (!response.ok) {
          throw new Error('Failed to fetch vehicle');
        }
        
        setVehicle(vehicle);
      } catch (error) {
        logger.error('Error fetching vehicle:', error);
        toast.error('Failed to load vehicle details');
      }
    };

    fetchVehicle();
  }, [params.id]);

  

    if (!user) {
      logger.debug('No user found, redirecting to login');
      toast.error('Please login to continue');
      await router.push('/login');
      return;
    }

    // Check if documents are verified from the profiles table
    try {
      
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      

      logger.debug('Profile data:', profile);

      if (!profile?.is_documents_verified) {
        logger.debug('Documents not verified, redirecting to profile');
        toast.error('Please verify your documents first');
        await router.push('/profile');
        return;
      }

      // If user is logged in and documents are verified, proceed to booking
      
      
      

      logger.debug('All checks passed, proceeding to booking');
      
      logger.debug('Redirecting to:', bookingUrl);
      await router.push(bookingUrl);
    } catch (error) {
      logger.error('Error checking user profile:', error);
      toast.error('Failed to verify user documents');
    }
  };

  if (!vehicle) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <VehicleDetails vehicle={vehicle} />
      <div className="max-w-xl mx-auto mt-8">
        <button 
          onClick={handleBookNow}
          className="w-full bg-[#FFB800] text-black py-2 rounded-lg hover:bg-[#F4A900] transition-colors"
        >
          Book Now
        </button>
      </div>
    </div>
  );
} 