import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await hash('admin123', 12);
  const admin = await prisma.users.upsert({
    where: { email: 'admin@onnrides.com' },
    update: {},
    create: {
      id: 'admin_' + Date.now().toString(),
      email: 'admin@onnrides.com',
      name: 'Admin',
      password_hash: adminPassword,
      role: 'admin',
      phone: '1234567890'
    },
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

  // 3. Create the necessary settings
  const maintenanceModeSetting = await prisma.settings.upsert({
    where: { key: 'maintenance_mode' },
    update: {},
    create: {
      id: crypto.randomUUID(),
      key: 'maintenance_mode',
      value: 'false',
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  const bookingGstPercentage = await prisma.settings.upsert({
    where: { key: 'booking_gst_percentage' },
    update: {},
    create: {
      id: crypto.randomUUID(),
      key: 'booking_gst_percentage', 
      value: '18',
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  const bookingServiceFeePercentage = await prisma.settings.upsert({
    where: { key: 'booking_service_fee_percentage' },
    update: {},
    create: {
      id: crypto.randomUUID(),
      key: 'booking_service_fee_percentage',
      value: '5',
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  const bookingAdvancePaymentPercentage = await prisma.settings.upsert({
    where: { key: 'booking_advance_payment_percentage' },
    update: {},
    create: {
      id: crypto.randomUUID(),
      key: 'booking_advance_payment_percentage',
      value: '5',
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  console.log({
    admin,
    sampleVehicle,
    hyderabadLocation,
    settings: {
      maintenanceMode: maintenanceModeSetting,
      bookingGstPercentage,
      bookingServiceFeePercentage,
      bookingAdvancePaymentPercentage
    }
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 