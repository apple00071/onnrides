export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md p-4 animate-pulse"
          >
            {/* Image skeleton */}
            <div className="w-full h-48 bg-gray-200 rounded-lg mb-4" />
            
            {/* Title skeleton */}
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
            
            {/* Description skeleton */}
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
            </div>
            
            {/* Price and details skeleton */}
            <div className="mt-4 flex justify-between items-center">
              <div className="h-6 bg-gray-200 rounded w-1/4" />
              <div className="h-10 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 