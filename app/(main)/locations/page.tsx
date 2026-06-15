import { Metadata } from 'next';
import Link from 'next/link';
import { Grid } from '@/components/layout/Grid';

export const metadata: Metadata = {
  title: 'Bike Rental Locations in Hyderabad | Mister Rides',
  description: 'Find Mister Rides bike and scooter rental hubs near you in Hyderabad. Easy pickup from Madhapur, Erragadda, Gachibowli, Kondapur, and more.',
  keywords: 'bike rental locations Hyderabad, rent bike Madhapur, rent scooter Erragadda, two wheeler hire Hitec City, bike rental near me',
};

const locations = [
  {
    id: 'madhapur',
    name: 'Madhapur',
    address: 'Plot no, 69, Road No. 57, Mega Hills, Madhapur, Hyderabad, 500081',
    description: 'Serving Hitec City, Gachibowli, Kondapur, and surrounding IT hubs. Easily accessible from Madhapur Metro Station.',
    phone: '+91 83090 31203',
  },
  {
    id: 'erragadda',
    name: 'Erragadda',
    address: 'R S hotel, Metro Station Erragadda, Prem Nagar, Erragadda, Hyderabad, 500018',
    description: 'Serving SR Nagar, Ameerpet, Kukatpally, and nearby commercial areas. Conveniently located right next to the metro station.',
    phone: '+91 83090 31203',
  },
  {
    id: 'gachibowli',
    name: 'Gachibowli',
    address: 'Gachibowli Cross Roads, near DLF Cyber City, Hyderabad, 500032',
    description: 'Ideal pickup point for tech professionals in financial district, DLF, and Nanakramguda.',
    phone: '+91 83090 31203',
  },
  {
    id: 'hitec-city',
    name: 'Hitec City',
    address: 'Hitec City Metro Station, near Cyber Towers, Hyderabad, 500081',
    description: 'Located in the heart of Hyderabad\'s tech corridor, serving Mindspace, Cyber Towers and corporate campuses.',
    phone: '+91 83090 31203',
  },
  {
    id: 'kondapur',
    name: 'Kondapur',
    address: 'Kondapur Main Road, near Botanical Garden, Hyderabad, 500084',
    description: 'Serving residential and business zones around Kondapur, Hafeezpet and botanical garden area.',
    phone: '+91 83090 31203',
  },
  {
    id: 'jubilee-hills',
    name: 'Jubilee Hills',
    address: 'Road No. 36, near Jubilee Hills Check Post, Hyderabad, 500033',
    description: 'Serving premium zones in Jubilee Hills, Banjara Hills, and Film Nagar.',
    phone: '+91 83090 31203',
  },
  {
    id: 'ameerpet',
    name: 'Ameerpet',
    address: 'Ameerpet Metro Station, Hyderabad, 500016',
    description: 'Central hub serving coaching centers, PG hostels, and retail markets in Ameerpet and Punjagutta.',
    phone: '+91 83090 31203',
  },
  {
    id: 'sr-nagar',
    name: 'SR Nagar',
    address: 'Sanjeeva Reddy Nagar Metro Station, Hyderabad, 500038',
    description: 'Serving student hubs and residential areas of SR Nagar, Balkampet and BK Guda.',
    phone: '+91 83090 31203',
  }
];

export default function LocationsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 mb-4">
          Our Bike Rental Locations in Hyderabad
        </h1>
        <p className="text-lg text-gray-600">
          Pick up your rental bike or scooter from any of our convenient locations across Hyderabad. Reach out to the nearest branch for hassle-free rides.
        </p>
      </div>

      <Grid cols={1} mdCols={2} gap={8} className="max-w-6xl mx-auto">
        {locations.map((loc) => (
          <div key={loc.id} className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <span className="inline-block bg-primary/10 text-primary font-semibold text-xs px-2.5 py-1 rounded-full mb-3">
                Active Hub
              </span>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{loc.name}</h2>
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">{loc.description}</p>
              
              <div className="border-t border-gray-100 pt-4 mt-2 space-y-2 text-sm text-gray-500">
                <div>
                  <span className="font-semibold text-gray-700">Address: </span>
                  {loc.address}
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Contact: </span>
                  <a href={`tel:${loc.phone.replace(/\s+/g, '')}`} className="text-primary hover:underline">
                    {loc.phone}
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
              <Link
                href={`/locations/${loc.id}`}
                className="text-[#f26e24] hover:text-[#e85d1c] font-semibold text-sm transition-colors flex items-center gap-1"
              >
                View Available Bikes &rarr;
              </Link>
            </div>
          </div>
        ))}
      </Grid>
    </div>
  );
}
