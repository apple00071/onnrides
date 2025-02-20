import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function copyVehicles() {
  const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL
  });

  try {
    // First, get all vehicles from the database
    const result = await pool.query(`
      SELECT 
        id,
        name,
        type,
        location,
        quantity,
        price_per_hour,
        min_booking_hours,
        is_available,
        images,
        status,
        created_at,
        updated_at
      FROM vehicles
    `);

    if (result.rows.length === 0) {
      console.log('No vehicles found in the database.');
      return;
    }

    // Log the found vehicles
    console.log(`Found ${result.rows.length} vehicles:`);
    result.rows.forEach((vehicle, index) => {
      console.log(`\n${index + 1}. Vehicle Details:`);
      console.log(`   ID: ${vehicle.id}`);
      console.log(`   Name: ${vehicle.name}`);
      console.log(`   Type: ${vehicle.type}`);
      console.log(`   Location: ${vehicle.location}`);
      console.log(`   Price per hour: ₹${vehicle.price_per_hour}`);
      console.log(`   Min booking hours: ${vehicle.min_booking_hours}`);
      console.log(`   Status: ${vehicle.status}`);
      console.log(`   Images: ${vehicle.images}`);
    });

    // Generate SQL insert statements
    let insertStatements = result.rows.map(vehicle => {
      const values = [
        vehicle.id,
        vehicle.name,
        vehicle.type,
        vehicle.location,
        vehicle.quantity,
        vehicle.price_per_hour,
        vehicle.min_booking_hours,
        vehicle.is_available,
        vehicle.images,
        vehicle.status,
        vehicle.created_at,
        vehicle.updated_at
      ];

      return pool.query(`
        INSERT INTO vehicles (
          id,
          name,
          type,
          location,
          quantity,
          price_per_hour,
          min_booking_hours,
          is_available,
          images,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          location = EXCLUDED.location,
          quantity = EXCLUDED.quantity,
          price_per_hour = EXCLUDED.price_per_hour,
          min_booking_hours = EXCLUDED.min_booking_hours,
          is_available = EXCLUDED.is_available,
          images = EXCLUDED.images,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at
      `, values);
    });

    // Execute all insert statements
    await Promise.all(insertStatements);
    console.log('\nSuccessfully copied all vehicles to the database!');

  } catch (error) {
    console.error('Error copying vehicles:', error);
  } finally {
    await pool.end();
  }
}

copyVehicles().catch(console.error); 