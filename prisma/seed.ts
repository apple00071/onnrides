import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await hash('admin123', 12);
  const admin = await prisma.users.upsert({
    where: { email: 'admin@onnrides.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'admin@onnrides.com',
      name: 'Admin',
      password_hash: adminPassword,
      role: 'admin',
      is_verified: true
    }
  });

  console.log({ admin });

  // Create initial settings
  await prisma.settings.createMany({
    data: [
      {
        id: uuidv4(),
        key: 'maintenance_mode',
        value: 'false'
      },
      {
        id: uuidv4(),
        key: 'site_name',
        value: 'OnnRides'
      }
    ],
    skipDuplicates: true
  });

  // Create sample vehicle
  const sampleVehicle = await prisma.vehicles.upsert({
    where: { id: 'sample_vehicle_1' },
    update: {},
    create: {
      id: 'sample_vehicle_1',
      name: 'Sample Car',
      type: 'car',
      location: 'Hyderabad',
      quantity: 1,
      price_per_hour: 500,
      min_booking_hours: 4,
      is_available: true,
      images: JSON.stringify(['sample_car.jpg']),
      status: 'active'
    },
  });

  // Create location
  const hyderabadLocation = await prisma.locations.upsert({
    where: { id: '550e8400-e29b-41d4-a716-446655440000' },
    update: {},
    create: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Hyderabad Central',
      address: 'Hyderabad, Telangana, India'
    },
  });

  console.log({ sampleVehicle, hyderabadLocation });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 