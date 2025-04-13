import Image from 'next/image';
import Link from 'next/link';

export default function FleetSection() {
  const fleetCategories = [
    {
      title: "Activa",
      image: "https://hnamzevcrob5uib6.public.blob.vercel-storage.com/kz1roRwcWAZcKILhRNTD3-honda_activa_6g_deluxe_2_33e2fc4437-uTnT7A9cJTBK4WbALAZHxLFgkmjVmy.png",
      description: "Honda Activa 6G with comfortable seating and smooth handling.",
      features: ["Automatic Transmission", "110cc Engine", "2 Seater", "₹20/hour"]
    },
    {
      title: "Baleno",
      image: "https://hnamzevcrob5uib6.public.blob.vercel-storage.com/Fv3It2Pgs9TkXW3Uvsp9P-suzuki-baleno-wMY6DYp1JpS9XerUvfkuITEEZxXrHX.png",
      description: "Maruti Suzuki Baleno with premium features and great mileage.",
      features: ["Manual Transmission", "1.2L Petrol Engine", "5 Seater", "₹95/hour"]
    },
    {
      title: "Swift Dzire",
      image: "https://hnamzevcrob5uib6.public.blob.vercel-storage.com/JE1l6dYI-rYDPY4s2jQ8--pngwing.com%20(4)-VXHG1ypo0WytD61GAgqg8QmiW7D0E6.png",
      description: "Maruti Suzuki Swift Dzire with elegant design and comfort.",
      features: ["Manual Transmission", "1.2L Petrol Engine", "5 Seater", "₹104/hour"]
    },
    {
      title: "Royal Enfield Classic 350",
      image: "https://hnamzevcrob5uib6.public.blob.vercel-storage.com/RCpZkE0VuJe6hO8b9350W-classic-350-gun-grey-N2c802Z05oTmZXmJa61m9GtmevJyII.png",
      description: "Royal Enfield Classic 350 with iconic design and powerful performance.",
      features: ["Manual Transmission", "350cc Engine", "2 Seater", "₹42/hour"]
    }
  ];

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-4">Our Fleet</h2>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Choose from our well-maintained vehicles to suit your needs
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {fleetCategories.map((category, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden group">
              <div className="h-[200px] relative w-full bg-gray-100 flex items-center justify-center">
                <div className="relative w-[80%] h-[80%]">
                  <Image
                    src={category.image}
                    alt={category.title}
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-sm font-semibold mb-2">{category.title}</h3>
                <p className="text-gray-600 text-xs mb-4">{category.description}</p>
                <ul className="text-xs text-gray-500 mb-4">
                  {category.features.map((feature, idx) => (
                    <li key={idx} className="mb-1">• {feature}</li>
                  ))}
                </ul>
                <Link 
                  href="/vehicles" 
                  className="inline-block bg-[#f26e24] text-white px-4 py-2 rounded-lg hover:bg-[#e05d13] transition-colors text-xs"
                  style={{ color: 'white !important' }}
                >
                  Book Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 