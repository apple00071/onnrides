const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'onnrides',
  user: process.env.POSTGRES_USER || 'postgres',
  password: 'Sulochana8%'
});

async function seedData() {
  const client = await pool.connect();
  try {
    // Create sample users
    const hashedPassword = await bcrypt.hash('user123', 10);
    await client.query(`
      INSERT INTO users (email, password_hash, role)
      VALUES 
        ('user1@example.com', $1, 'user'),
        ('user2@example.com', $1, 'user')
      ON CONFLICT (email) DO NOTHING
    `, [hashedPassword]);

    // Create sample profiles
    await client.query(`
      INSERT INTO profiles (user_id, name, phone)
      SELECT id, 'User ' || id, '123456789' || id
      FROM users
      WHERE email IN ('user1@example.com', 'user2@example.com')
      ON CONFLICT (user_id) DO NOTHING
    `);

    // Create sample vehicles
    await client.query(`
      INSERT INTO vehicles (
        name, description, type, brand, model, year, color,
        registration_number, transmission, fuel_type, mileage,
        seating_capacity, price_per_day, image_url, location
      )
      VALUES 
        (
          'Honda City 2022',
          'Comfortable sedan for city driving',
          'car',
          'Honda',
          'City',
          2022,
          'White',
          'KA01AB1234',
          'Automatic',
          'Petrol',
          18.5,
          5,
          2500,
          'https://example.com/honda-city.jpg',
          'Bangalore'
        ),
        (
          'Royal Enfield Classic 350',
          'Iconic motorcycle for a great riding experience',
          'bike',
          'Royal Enfield',
          'Classic 350',
          2023,
          'Black',
          'KA01CD5678',
          'Manual',
          'Petrol',
          35,
          2,
          1000,
          'https://example.com/re-classic.jpg',
          'Bangalore'
        )
      ON CONFLICT (registration_number) DO NOTHING
    `);

    // Create sample bookings
    await client.query(`
      INSERT INTO bookings (
        user_id,
        vehicle_id,
        pickup_date,
        dropoff_date,
        total_amount,
        status
      )
      SELECT 
        u.id,
        v.id,
        NOW() - interval '1 day',
        NOW() + interval '2 days',
        v.price_per_day * 3,
        'pending'
      FROM users u
      CROSS JOIN vehicles v
      WHERE u.email = 'user1@example.com'
      LIMIT 1
    `);

    // Create sample document submissions
    await client.query(`
      INSERT INTO document_submissions (
        user_id,
        document_type,
        document_url,
        status
      )
      SELECT 
        id,
        'driving_license',
        'https://example.com/license.pdf',
        'pending'
      FROM users
      WHERE email = 'user2@example.com'
    `);

    console.log('Sample data added successfully');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedData(); 