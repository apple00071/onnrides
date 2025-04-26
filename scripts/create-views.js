// Script to create database views for UUID handling
require('dotenv').config();
const { Client } = require('pg');

async function createDatabaseViews() {
  console.log('===== CREATING DATABASE VIEWS =====');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!\n');

    // Create users_view
    console.log('Creating users_view...');
    try {
      await client.query(`DROP VIEW IF EXISTS users_view`);
      
      await client.query(`
        CREATE VIEW users_view AS
        SELECT 
          id::text as id,
          name,
          email,
          password_hash,
          phone,
          reset_token,
          reset_token_expiry,
          is_blocked,
          role,
          created_at,
          updated_at
        FROM users
      `);
      
      console.log('✅ users_view created successfully');
    } catch (error) {
      console.error(`❌ Error creating users_view: ${error.message}`);
    }
    
    // Create bookings_view
    console.log('\nCreating bookings_view...');
    try {
      await client.query(`DROP VIEW IF EXISTS bookings_view`);
      
      await client.query(`
        CREATE VIEW bookings_view AS
        SELECT 
          id::text as id,
          user_id::text as user_id,
          vehicle_id::text as vehicle_id,
          start_date,
          end_date,
          total_hours,
          total_price,
          status,
          payment_status,
          payment_details,
          created_at,
          updated_at,
          pickup_location,
          dropoff_location,
          booking_id,
          payment_intent_id
        FROM bookings
      `);
      
      console.log('✅ bookings_view created successfully');
    } catch (error) {
      console.error(`❌ Error creating bookings_view: ${error.message}`);
    }
    
    // Create documents_view
    console.log('\nCreating documents_view...');
    try {
      await client.query(`DROP VIEW IF EXISTS documents_view`);
      
      await client.query(`
        CREATE VIEW documents_view AS
        SELECT 
          id::text as id,
          user_id::text as user_id,
          type,
          status,
          file_url,
          rejection_reason,
          created_at,
          updated_at
        FROM documents
      `);
      
      console.log('✅ documents_view created successfully');
    } catch (error) {
      console.error(`❌ Error creating documents_view: ${error.message}`);
    }
    
    // Create vehicles_view
    console.log('\nCreating vehicles_view...');
    try {
      await client.query(`DROP VIEW IF EXISTS vehicles_view`);
      
      await client.query(`
        CREATE VIEW vehicles_view AS
        SELECT 
          id::text as id,
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
          updated_at,
          price_15_days,
          price_30_days,
          price_7_days
        FROM vehicles
      `);
      
      console.log('✅ vehicles_view created successfully');
    } catch (error) {
      console.error(`❌ Error creating vehicles_view: ${error.message}`);
    }

    // Verify the views
    console.log('\nVerifying views:');
    const views = ['users_view', 'bookings_view', 'documents_view', 'vehicles_view'];
    
    for (const view of views) {
      try {
        const checkResult = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name = $1
          ) as exists
        `, [view]);
        
        if (checkResult.rows[0].exists) {
          console.log(`✅ ${view} exists`);
          
          // Test query the view
          const sampleResult = await client.query(`SELECT * FROM ${view} LIMIT 1`);
          console.log(`  - Query test: ${sampleResult.rows.length > 0 ? 'Successful' : 'No data'}`);
        } else {
          console.log(`❌ ${view} does not exist`);
        }
      } catch (checkError) {
        console.error(`❌ Error checking ${view}: ${checkError.message}`);
      }
    }
    
    console.log('\nView creation completed');
  } catch (error) {
    console.error('Error creating views:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the script
createDatabaseViews().catch(console.error); 