// Script to validate UUID handling between API and database
require('dotenv').config();
const { Client } = require('pg');
const fetch = require('node-fetch');
const bcrypt = require('bcryptjs');

async function validateUuidFix() {
  console.log('===== UUID FIX VALIDATION =====');
  
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

    // 1. Check table column types
    console.log('1. Checking UUID column types in database:');
    const columnsToCheck = [
      { table: 'users', column: 'id' },
      { table: 'bookings', column: 'id' },
      { table: 'bookings', column: 'user_id' },
      { table: 'bookings', column: 'vehicle_id' },
      { table: 'documents', column: 'id' },
      { table: 'documents', column: 'user_id' },
      { table: 'vehicles', column: 'id' }
    ];
    
    let allColumnsValid = true;
    
    for (const col of columnsToCheck) {
      const columnResult = await client.query(`
        SELECT data_type
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [col.table, col.column]);
      
      if (columnResult.rows.length === 0) {
        console.log(`❌ ${col.table}.${col.column}: Column not found!`);
        allColumnsValid = false;
        continue;
      }
      
      const dataType = columnResult.rows[0].data_type;
      if (dataType !== 'uuid') {
        console.log(`❌ ${col.table}.${col.column}: Found ${dataType}, expected uuid`);
        allColumnsValid = false;
      } else {
        console.log(`✅ ${col.table}.${col.column}: ${dataType}`);
      }
    }
    
    if (!allColumnsValid) {
      console.log('\n⚠️ Some columns have incorrect data types. Please run the migration to fix them.');
    } else {
      console.log('\n✅ All columns have the correct UUID data type!');
    }
    
    // 2. Check database views
    console.log('\n2. Checking database views:');
    const viewsToCheck = ['users_view', 'bookings_view', 'documents_view'];
    
    for (const viewName of viewsToCheck) {
      const viewResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.views 
          WHERE table_schema = 'public' 
          AND table_name = $1
        ) as exists
      `, [viewName]);
      
      if (viewResult.rows[0].exists) {
        console.log(`✅ View ${viewName} exists`);
        
        // Check the view definition
        try {
          const viewDefResult = await client.query(`
            SELECT pg_get_viewdef('${viewName}', true) as view_def
          `);
          
          if (viewDefResult.rows.length > 0) {
            const viewDef = viewDefResult.rows[0].view_def;
            const hasUuidCast = viewDef.toLowerCase().includes('::text');
            
            if (hasUuidCast) {
              console.log(`  ✅ View ${viewName} properly casts UUIDs to text`);
            } else {
              console.log(`  ❌ View ${viewName} might not properly cast UUIDs to text`);
            }
          }
        } catch (viewDefError) {
          console.log(`  ❌ Could not check view definition: ${viewDefError.message}`);
        }
      } else {
        console.log(`❌ View ${viewName} does not exist`);
      }
    }
    
    // 3. Check foreign key constraints
    console.log('\n3. Checking foreign key constraints:');
    const constraintsResult = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name, kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND (tc.table_name = 'bookings' OR tc.table_name = 'documents')
      ORDER BY tc.table_name, kcu.column_name
    `);
    
    if (constraintsResult.rows.length === 0) {
      console.log('❌ No foreign key constraints found!');
    } else {
      console.log('Found constraints:');
      constraintsResult.rows.forEach(constraint => {
        console.log(`✅ ${constraint.constraint_name}: ${constraint.table_name}.${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
      });
    }
    
    // 4. Test creating a user directly in the database
    console.log('\n4. Testing direct user creation in database:');
    const timestamp = Date.now();
    const testEmail = `test-validate-${timestamp}@example.com`;
    const testName = `Test Validation ${timestamp}`;
    const hashedPassword = await bcrypt.hash(`Password${timestamp}!`, 10);
    
    const insertResult = await client.query(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, 'user')
      RETURNING id, name, email, role, pg_typeof(id) as id_type
    `, [testName, testEmail, hashedPassword]);
    
    if (insertResult.rows.length === 0) {
      console.log('❌ Failed to create test user in database');
    } else {
      const dbUser = insertResult.rows[0];
      console.log('User created in database:');
      console.log(`- ID: ${dbUser.id} (${dbUser.id_type})`);
      console.log(`- Email: ${dbUser.email}`);
      
      // Verify UUID format
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidUuid = uuidPattern.test(String(dbUser.id));
      console.log(`- Valid UUID format: ${isValidUuid ? '✅ Yes' : '❌ No'}`);
      
      // 5. Test view conversion
      console.log('\n5. Testing view conversion:');
      try {
        const viewResult = await client.query(`
          SELECT id, email FROM users_view WHERE email = $1
        `, [testEmail]);
        
        if (viewResult.rows.length > 0) {
          const viewUser = viewResult.rows[0];
          console.log(`- View ID: ${viewUser.id} (${typeof viewUser.id})`);
          console.log(`- Original ID: ${dbUser.id}`);
          console.log(`- IDs match (after string conversion): ${String(viewUser.id) === String(dbUser.id) ? '✅ Yes' : '❌ No'}`);
        } else {
          console.log('❌ User not found in users_view');
        }
      } catch (viewError) {
        console.log(`❌ Error querying view: ${viewError.message}`);
      }
      
      // 6. Test API signup (if server is running)
      console.log('\n6. Testing API signup:');
      const apiTestEmail = `test-api-${timestamp}@example.com`;
      
      try {
        const response = await fetch('http://localhost:3000/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `API Test User ${timestamp}`,
            email: apiTestEmail,
            password: `Password${timestamp}!`,
            phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`
          })
        });
        
        const apiData = await response.json();
        
        if (!response.ok) {
          console.log(`❌ API signup failed: ${response.status}`);
          console.log(apiData);
        } else {
          console.log('✅ API signup successful!');
          const apiUserId = apiData.user?.id;
          console.log(`- API returned user ID: ${apiUserId}`);
          console.log(`- ID type in JS: ${typeof apiUserId}`);
          console.log(`- Valid UUID format: ${uuidPattern.test(String(apiUserId)) ? '✅ Yes' : '❌ No'}`);
          
          // Verify the user in the database
          const apiUserCheck = await client.query(`
            SELECT id, pg_typeof(id) as id_type FROM users WHERE email = $1
          `, [apiTestEmail]);
          
          if (apiUserCheck.rows.length > 0) {
            const dbId = apiUserCheck.rows[0].id;
            console.log(`- Database ID: ${dbId} (${apiUserCheck.rows[0].id_type})`);
            console.log(`- API and DB IDs match: ${String(apiUserId) === String(dbId) ? '✅ Yes' : '❌ No'}`);
          } else {
            console.log('❌ API-created user not found in database!');
          }
          
          // Clean up API test user
          await client.query('DELETE FROM users WHERE email = $1', [apiTestEmail]);
        }
      } catch (apiError) {
        console.log(`❌ API test error: ${apiError.message}`);
        console.log('   Is your server running at http://localhost:3000?');
      }
      
      // Clean up database test user
      await client.query('DELETE FROM users WHERE email = $1', [testEmail]);
    }
    
    // 7. Check Prisma migration state
    console.log('\n7. Checking Prisma migration state:');
    try {
      const migrationsResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '_prisma_migrations'
        ) as exists;
      `);
      
      if (migrationsResult.rows[0].exists) {
        const migrationsList = await client.query(`
          SELECT migration_name, finished_at
          FROM _prisma_migrations
          ORDER BY migration_name
        `);
        
        console.log(`Found ${migrationsList.rows.length} migrations in _prisma_migrations table`);
        
        // Check for our problematic migration
        const problemMigration = migrationsList.rows.find(m => 
          m.migration_name.includes('fix_all_uuid_types_comprehensive'));
        
        if (problemMigration) {
          console.log(`⚠️ Found potentially problematic migration: ${problemMigration.migration_name}`);
          console.log('   You may need to run the reset-prisma-migration script');
        } else {
          console.log('✅ No problematic migrations found in the _prisma_migrations table');
        }
      } else {
        console.log('❓ No _prisma_migrations table found. Prisma migrations may not be set up.');
      }
    } catch (migrationError) {
      console.log(`❌ Error checking migrations: ${migrationError.message}`);
    }
    
    console.log('\nValidation complete!');
  } catch (error) {
    console.error('Validation error:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the validation
validateUuidFix().catch(console.error); 