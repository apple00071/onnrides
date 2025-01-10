import logger from '@/lib/logger';
require('dotenv').config();



interface Column {
  column_name: string;
  data_type: string;
  character_maximum_length: number | null;
  column_default: string | null;
  is_nullable: string;
}

interface ForeignKey {
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

interface Index {
  indexname: string;
  indexdef: string;
}

async function checkTables() {
  
  try {
    logger.debug('Checking database tables...\n');

    // Get all tables
    const tables: QueryResult<{ tablename: string }> = await client.query(`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
    `);

    for (const table of tables.rows) {
      
      logger.debug(`\n📋 Checking table: ${tableName}`);

      // Get columns for each table
      const columns: QueryResult<Column> = await client.query(`
        SELECT 
          column_name, 
          data_type, 
          character_maximum_length,
          column_default,
          is_nullable
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      // Get foreign keys
      const foreignKeys: QueryResult<ForeignKey> = await client.query(`
        SELECT
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = $1
      `, [tableName]);

      // Print column details
      columns.rows.forEach((column: Column) => {
        
        
        
        
        
        logger.debug(`  ├─ ${column.column_name}: ${column.data_type}${
          column.character_maximum_length ? `(${column.character_maximum_length})` : ''
        } ${nullable} ${defaultVal}${fkInfo}`);
      });

      // Get indexes
      const indexes: QueryResult<Index> = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = $1
      `, [tableName]);

      if (indexes.rows.length > 0) {
        logger.debug('\n  Indexes:');
        indexes.rows.forEach((index: Index) => {
          logger.debug(`  └─ ${index.indexname}`);
        });
      }
    }

    logger.debug('\n✅ Database schema check completed successfully!');
  } catch (error) {
    logger.error('Error checking tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

checkTables()
  .catch((err) => {
    logger.error('Failed to check tables:', err);
    process.exit(1);
  }); 