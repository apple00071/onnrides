import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 10; // 10 seconds timeout

interface DatabaseInfo {
  time: Date;
  version: string;
  database: string;
  connection_info: {
    backend_pid: number;
    client_addr: string | null;
    state: string;
    query_start: Date | null;
  };
  size: string;
}

interface DatabaseRow {
  datname: string;
  owner: string;
  encoding: string;
}

async function testDatabaseConnection(): Promise<{
  success: boolean;
  info?: DatabaseInfo;
  error?: string;
}> {
  const requestId = `db_health_${Date.now()}`;
  
  try {
    logger.info('Testing database connection', { requestId });
    
    // Comprehensive database info query
    const result = await query(`
      SELECT 
        NOW()::timestamp as time,
        version() as version,
        current_database() as database,
        (
          SELECT json_build_object(
            'backend_pid', pid,
            'client_addr', client_addr,
            'state', state,
            'query_start', query_start
          )
          FROM pg_stat_activity 
          WHERE pid = pg_backend_pid()
        ) as connection_info,
        pg_size_pretty(pg_database_size(current_database())) as size
    `);
    
    logger.info('Database connection test successful', {
      requestId,
      database: result.rows[0]?.database,
      size: result.rows[0]?.size
    });

    return {
      success: true,
      info: result.rows[0]
    };
  } catch (error) {
    logger.error('Database connection test failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function testAllDatabases() {
  const requestId = `db_health_all_${Date.now()}`;
  
  try {
    // Get list of all databases
    const dbList = await query(`
      SELECT 
        datname, 
        pg_catalog.pg_get_userbyid(datdba) as owner,
        pg_encoding_to_char(encoding) as encoding
      FROM pg_database
      WHERE datistemplate = false
      ORDER BY datname;
    `);

    // Test connection to each database
    const results = await Promise.all(
      dbList.rows.map(async (db: DatabaseRow) => {
        const connectionTest = await testDatabaseConnection();
        
        return {
          name: db.datname,
          owner: db.owner,
          encoding: db.encoding,
          connection: connectionTest
        };
      })
    );

    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        databases: results
      }
    };
  } catch (error) {
    logger.error('Failed to test all databases', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const result = await testDatabaseConnection();

    if (!result.success) {
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        error: result.error
      }, { 
        status: 500
      });
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Database connection successful',
      info: result.info
    });
  } catch (error) {
    logger.error('Database connection failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500
    });
  }
} 