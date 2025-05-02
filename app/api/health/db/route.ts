import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
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

interface DatabaseList {
  datname: string;
  owner: string;
  encoding: string;
}

async function testDatabaseConnection(dbUrl: string): Promise<{
  success: boolean;
  info?: DatabaseInfo;
  error?: string;
}> {
  let testClient: PrismaClient | null = null;
  const requestId = `db_health_${Date.now()}`;
  
  try {
    logger.info('Testing database connection', { requestId, dbUrl: dbUrl.split('@')[1] });
    
    testClient = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: dbUrl
        }
      }
    });

    // Test query with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    // Comprehensive database info query
    const infoPromise: Promise<DatabaseInfo[]> = testClient.$queryRaw`
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
    `;
    
    const info = await Promise.race([infoPromise, timeoutPromise]) as DatabaseInfo[];
    
    logger.info('Database connection test successful', {
      requestId,
      database: info[0]?.database,
      size: info[0]?.size
    });

    return {
      success: true,
      info: info[0]
    };
  } catch (error) {
    logger.error('Database connection test failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      dbUrl: dbUrl.split('@')[1] // Log only host part for security
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    if (testClient) {
      await testClient.$disconnect();
    }
  }
}

async function testAllDatabases() {
  let mainClient: PrismaClient | null = null;
  const requestId = `db_health_all_${Date.now()}`;
  
  try {
    // First get list of all databases
    mainClient = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

    const dbList: DatabaseList[] = await mainClient.$queryRaw`
      SELECT 
        datname, 
        pg_catalog.pg_get_userbyid(datdba) as owner,
        pg_encoding_to_char(encoding) as encoding
      FROM pg_database
      WHERE datistemplate = false
      ORDER BY datname;
    `;

    // Test connection to each database
    const results = await Promise.all(
      dbList.map(async (db) => {
        // Construct connection URL for each database
        const baseUrl = process.env.DATABASE_URL || '';
        const dbUrl = baseUrl.replace(/\/[^/]+$/, `/${db.datname}`);
        
        const connectionTest = await testDatabaseConnection(dbUrl);
        
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
  } finally {
    if (mainClient) {
      await mainClient.$disconnect();
    }
  }
}

export async function GET() {
  try {
    const result = await testAllDatabases();
    
    return NextResponse.json(result, {
      status: result.success ? 200 : 503
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 