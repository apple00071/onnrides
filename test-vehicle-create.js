require('dotenv').config();
const { Pool } = require('pg');
const { randomUUID } = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createTestVehicle() {
  try {
    console.log('Checking vehicles table structure...');
    const tableInfo = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles'
    `);
    console.log('Vehicles table columns:', tableInfo.rows.map(row => `${row.column_name} (${row.data_type})`));

    const vehicleData = {
      id: randomUUID(),
      name: 'Test Vehicle',
      type: 'bike',
      location: JSON.stringify(['Madhapur']),
      pricePerHour: 50,
      minBookingHours: 1,
      quantity: 1,
      images: JSON.stringify(['https://example.com/image.jpg']),
      status: 'active',
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Attempting to create a vehicle with data:', vehicleData);

    const result = await pool.query(`
      INSERT INTO vehicles (
        id,
        name, 
        type, 
        location, 
        "pricePerHour", 
        "minBookingHours", 
        quantity, 
        images, 
        status, 
        "isAvailable", 
        "createdAt", 
        "updatedAt"
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *
    `, [
      vehicleData.id,
      vehicleData.name,
      vehicleData.type,
      vehicleData.location,
      vehicleData.pricePerHour,
      vehicleData.minBookingHours,
      vehicleData.quantity,
      vehicleData.images,
      vehicleData.status,
      vehicleData.isAvailable,
      vehicleData.createdAt,
      vehicleData.updatedAt
    ]);

    console.log('Vehicle created successfully:', result.rows[0]);
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await pool.end();
  }
}

createTestVehicle(); 