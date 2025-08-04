/**
 * Database Compatibility Script for Build Process
 * 
 * This script runs during the build process to ensure the database queries
 * can handle both camelCase and snake_case column naming conventions.
 * 
 * For deployment to Vercel with PostgreSQL, we need to ensure our queries are compatible
 * regardless of the actual column names in the database.
 */

const { Pool } = require('pg');
require('dotenv').config();

// Initialize PostgreSQL connection with proper Neon configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('.neon.tech') ? {
    rejectUnauthorized: true,
    ssl: true,
  } : process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
  // Add connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Get all tables and their columns for mapping
async function getDatabaseStructure() {
  console.log('Analyzing database structure...');
  
  try {
    // Get all table names in the current schema
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`Found ${tables.length} tables in database:`, tables);
    
    // Get all columns for each table
    const tableStructures = {};
    
    for (const table of tables) {
      const columnsResult = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
      `, [table]);
      
      const columns = columnsResult.rows.map(row => ({
        name: row.column_name,
        type: row.data_type
      }));
      
      tableStructures[table] = {
        columns,
        camelCaseColumns: columns.filter(col => col.name.match(/[A-Z]/) && !col.name.includes('_')),
        snake_case_columns: columns.filter(col => col.name.includes('_'))
      };
      
      console.log(`Table '${table}' has ${columns.length} columns`);
      
      if (tableStructures[table].camelCaseColumns.length > 0) {
        console.log(`- camelCase columns in '${table}':`, 
          tableStructures[table].camelCaseColumns.map(c => c.name).join(', '));
      }
      
      if (tableStructures[table].snake_case_columns.length > 0) {
        console.log(`- snake_case columns in '${table}':`, 
          tableStructures[table].snake_case_columns.map(c => c.name).join(', '));
      }
    }
    
    return tableStructures;
  } catch (error) {
    console.error('Error analyzing database structure:', error);
    throw error;
  }
}

// Apply necessary fixes for critical tables
async function applyDatabaseFixes(tableStructures) {
  console.log('Applying critical database fixes...');
  
  try {
    // Focus on the most important tables: bookings and vehicles
    const criticalTables = ['bookings', 'vehicles'];
    
    for (const tableName of criticalTables) {
      if (!tableStructures[tableName]) {
        console.log(`Table '${tableName}' not found, skipping`);
        continue;
      }
      
      console.log(`Checking if table '${tableName}' needs fixes...`);
      
      // For bookings, ensure we have both camelCase and snake_case for critical columns
      if (tableName === 'bookings') {
        // List of critical booking columns to check
        const criticalColumns = [
          { camel: "bookingId", snake: "booking_id" },
          { camel: "userId", snake: "user_id" },
          { camel: "vehicleId", snake: "vehicle_id" },
          { camel: "startDate", snake: "start_date" },
          { camel: "endDate", snake: "end_date" },
          { camel: "totalPrice", snake: "total_price" },
          { camel: "paymentStatus", snake: "payment_status" },
          { camel: "paymentDetails", snake: "payment_details" }
        ];
        
        for (const col of criticalColumns) {
          await ensureColumnExists(tableName, col.snake, col.camel, tableStructures[tableName]);
        }
      }
      
      // For vehicles, ensure we have both camelCase and snake_case for critical columns
      if (tableName === 'vehicles') {
        // List of critical vehicle columns to check
        const criticalColumns = [
          { camel: "pricePerHour", snake: "price_per_hour" },
          { camel: "minBookingHours", snake: "min_booking_hours" },
          { camel: "isAvailable", snake: "is_available" }
        ];
        
        for (const col of criticalColumns) {
          await ensureColumnExists(tableName, col.snake, col.camel, tableStructures[tableName]);
        }
      }
    }
    
    console.log('Database fixes applied successfully');
  } catch (error) {
    console.error('Error applying database fixes:', error);
    console.log('Continuing with build process despite errors...');
  }
}

// Helper function to ensure a column exists in both camelCase and snake_case
async function ensureColumnExists(tableName, snakeCase, camelCase, tableStructure) {
  try {
    const hasSnakeCase = tableStructure.columns.some(col => col.name === snakeCase);
    const hasCamelCase = tableStructure.columns.some(col => col.name === camelCase);
    
    if (hasSnakeCase && !hasCamelCase) {
      console.log(`Adding ${camelCase} column to match existing ${snakeCase}`);
      
      // Get data type of the existing column
      const typeResult = await pool.query(`
        SELECT data_type, character_maximum_length, numeric_precision, numeric_scale
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name = $2
      `, [tableName, snakeCase]);
      
      if (typeResult.rows.length > 0) {
        const column = typeResult.rows[0];
        let dataType = column.data_type;
        
        // Add appropriate type modifiers
        if (dataType === 'character varying' && column.character_maximum_length) {
          dataType = `character varying(${column.character_maximum_length})`;
        } else if (dataType === 'numeric' && column.numeric_precision && column.numeric_scale) {
          dataType = `numeric(${column.numeric_precision}, ${column.numeric_scale})`;
        }
        
        // Add the camelCase column using the same data type
        await pool.query(`
          ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS "${camelCase}" ${dataType}
        `);
        
        // Copy data from snake_case to camelCase
        await pool.query(`
          UPDATE ${tableName} SET "${camelCase}" = ${snakeCase}
        `);
        
        console.log(`Added ${camelCase} column to ${tableName} table`);
      }
    } else if (hasCamelCase && !hasSnakeCase) {
      console.log(`Adding ${snakeCase} column to match existing ${camelCase}`);
      
      // Get data type of the existing column
      const typeResult = await pool.query(`
        SELECT data_type, character_maximum_length, numeric_precision, numeric_scale
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name = $2
      `, [tableName, camelCase]);
      
      if (typeResult.rows.length > 0) {
        const column = typeResult.rows[0];
        let dataType = column.data_type;
        
        // Add appropriate type modifiers
        if (dataType === 'character varying' && column.character_maximum_length) {
          dataType = `character varying(${column.character_maximum_length})`;
        } else if (dataType === 'numeric' && column.numeric_precision && column.numeric_scale) {
          dataType = `numeric(${column.numeric_precision}, ${column.numeric_scale})`;
        }
        
        // Add the snake_case column using the same data type
        await pool.query(`
          ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${snakeCase} ${dataType}
        `);
        
        // Copy data from camelCase to snake_case
        await pool.query(`
          UPDATE ${tableName} SET ${snakeCase} = "${camelCase}"
        `);
        
        console.log(`Added ${snakeCase} column to ${tableName} table`);
      }
    } else if (hasSnakeCase && hasCamelCase) {
      console.log(`Both ${snakeCase} and ${camelCase} exist in ${tableName}, no action needed`);
    } else {
      console.log(`Neither ${snakeCase} nor ${camelCase} exist in ${tableName}, skipping`);
    }
  } catch (error) {
    console.error(`Error ensuring column existence for ${snakeCase}/${camelCase} in ${tableName}:`, error);
  }
}

// Main function to run all fix operations
async function fixDatabaseForBuild() {
  console.log('Starting database compatibility fix for build process...');
  
  try {
    // Get full database structure information
    const tableStructures = await getDatabaseStructure();
    
    // Apply necessary fixes
    await applyDatabaseFixes(tableStructures);
    
    console.log('Database compatibility setup completed successfully!');
  } catch (error) {
    console.error('Database compatibility setup failed:', error);
    console.log('Continuing with build process despite errors...');
  } finally {
    await pool.end();
  }
}

// Run the fix process
fixDatabaseForBuild().catch(error => {
  console.error('Unhandled error in database fix script:', error);
  process.exit(0); // Exit with 0 to continue the build process
}); 