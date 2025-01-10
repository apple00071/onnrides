'use client';


import Image from 'next/image';


interface Vehicle {
  id: string;
  name: string;
  description: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  transmission: string;
  fuel_type: string;
  mileage: number;
  seating_capacity: number;
  price_per_day: number;
  is_available: boolean;
  image_url: string;
  location: string;
  total_rides: number;
}

export default function VehiclesList() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  
  
  
  
  
  
  

  useEffect(() => {
    
        setError(null);
        
        
        if (type) queryParams.set('type', type);
        if (location) queryParams.set('location', location);
        if (pickup) queryParams.set('pickup', pickup);
        if (dropoff) queryParams.set('dropoff', dropoff);
        
        
        if (!response.ok) {
          throw new Error('Failed to fetch vehicles');
        }
        
        
        setVehicles(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [type, location, pickup, dropoff]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f26e24]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-[#f26e24] text-white rounded-md hover:bg-[#d85e1c] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-gray-500 mb-4">No vehicles found matching your criteria</p>
        <button
          onClick={() => router.push('/vehicles')}
          className="px-4 py-2 bg-[#f26e24] text-white rounded-md hover:bg-[#d85e1c] transition-colors"
        >
          Clear Filters
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="relative h-48">
              <Image
                src={vehicle.image_url || '/images/vehicle-placeholder.png'}
                alt={vehicle.name}
                fill
                className="object-cover"
              />
            </div>
            
            <div className="p-4">
              <h3 className="text-xl font-semibold mb-2">{vehicle.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{vehicle.description}</p>
              
              <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Type:</span>
                  <span>{vehicle.type}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Year:</span>
                  <span>{vehicle.year}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Transmission:</span>
                  <span>{vehicle.transmission}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Fuel:</span>
                  <span>{vehicle.fuel_type}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-[#f26e24] font-semibold">
                  ₹{vehicle.price_per_day}/day
                </div>
                <button
                  onClick={() => router.push(`/vehicles/${vehicle.id}`)}
                  className="px-4 py-2 bg-[#f26e24] text-white rounded-md hover:bg-[#d85e1c] transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 