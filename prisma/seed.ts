import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.vehicle.deleteMany();

  // Seed vehicles
  const vehicles = [
    {
      name: "Honda Activa 6G",
      type: "scooter",
      description: "Honda Activa 6G with comfortable seating and smooth handling.",
      images: JSON.stringify([
        "https://d2m3nfprmhqjvd.cloudfront.net/vehicles/honda-activa-6g.webp",
        "https://d2m3nfprmhqjvd.cloudfront.net/vehicles/honda-activa-6g-side.webp"
      ]),
      location: "Mumbai",
      quantity: 5,
      price_per_hour: 20,
      min_booking_hours: 4,
      is_available: true,
      status: "active",
      vehicle_category: "normal"
    },
    {
      name: "Honda Dio",
      type: "scooter",
      description: "Honda Dio with stylish design and excellent mileage.",
      images: JSON.stringify([
        "https://d2m3nfprmhqjvd.cloudfront.net/vehicles/honda-dio.webp",
        "https://d2m3nfprmhqjvd.cloudfront.net/vehicles/honda-dio-side.webp"
      ]),
      location: "Mumbai",
      quantity: 3,
      price_per_hour: 25,
      min_booking_hours: 4,
      is_available: true,
      status: "active",
      vehicle_category: "normal"
    },
    {
      name: "Suzuki Access 125",
      type: "scooter",
      description: "Suzuki Access 125 with powerful engine and premium features.",
      images: JSON.stringify([
        "https://d2m3nfprmhqjvd.cloudfront.net/vehicles/suzuki-access-125.webp",
        "https://d2m3nfprmhqjvd.cloudfront.net/vehicles/suzuki-access-125-side.webp"
      ]),
      location: "Mumbai",
      quantity: 4,
      price_per_hour: 30,
      min_booking_hours: 4,
      is_available: true,
      status: "active",
      vehicle_category: "normal"
    },
    {
      name: "Royal Enfield Classic 350",
      type: "bike",
      description: "Royal Enfield Classic 350 with iconic design and powerful performance.",
      images: JSON.stringify([
        "https://d2m3nfprmhqjvd.cloudfront.net/vehicles/royal-enfield-classic-350.webp",
        "https://d2m3nfprmhqjvd.cloudfront.net/vehicles/royal-enfield-classic-350-side.webp"
      ]),
      location: "Mumbai",
      quantity: 2,
      price_per_hour: 42,
      min_booking_hours: 4,
      is_available: true,
      status: "active",
      vehicle_category: "premium"
    }
  ];

  for (const vehicle of vehicles) {
    await prisma.vehicle.create({
      data: vehicle
    });
  }

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 