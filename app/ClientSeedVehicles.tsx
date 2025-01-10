import logger from '@/lib/logger';
'use client';



export default function ClientSeedVehicles() {
  

      // Check if vehicles already exist
      
      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }
      

      logger.debug(`Found ${existingVehicles?.length || 0} existing vehicles`);

      // Only seed if no vehicles exist
      if (existingVehicles?.length > 0) {
        return;
      }

      

      logger.debug('Attempting to insert initial vehicles:', initialVehicles);

      

      if (!insertResponse.ok) {
        throw new Error('Failed to seed vehicles');
      }

      
      logger.debug('Successfully inserted vehicles:', data);

    } catch (error) {
      logger.error('Comprehensive seeding error:', error);
    }
  };

  useEffect(() => {
    seedVehicles();
  }, []);

  return null;
} 