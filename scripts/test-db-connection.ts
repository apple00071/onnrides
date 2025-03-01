#!/usr/bin/env ts-node
/**
 * Database Connection Test Script
 * 
 * This script tests both Prisma and direct PostgreSQL connections
 * to help diagnose database connection issues.
 * 
 * Usage:
 * $ npx ts-node scripts/test-db-connection.ts
 */

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { setTimeout } from 'timers/promises';

// Set up logger for test output
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${message}`, data ? data : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error ? error : '');
  },
  success: (message: string) => {
    console.log(`[SUCCESS] ${message}`);
  }
};

// Create a Prisma client for testing
const prisma = new PrismaClient({
  log: ['error', 'query', 'info'],
});

// Create a direct PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined,
});

/**
 * Test Prisma Connection
 */
async function testPrismaConnection() {
  logger.info('Testing Prisma connection...');
  
  try {
    // Attempt to run a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test, NOW() as current_time`;
    logger.success('Prisma connection successful!');
    console.log('Query result:', result);
    
    // Get and log connection information
    const connectionInfo = await prisma.$queryRaw`
      SELECT 
        current_database() as database,
        current_user as user,
        inet_server_addr() as server_address,
        inet_server_port() as server_port,
        version() as postgresql_version
    `;
    console.log('Connection info:', connectionInfo);
    
    return true;
  } catch (error) {
    logger.error('Prisma connection failed:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Test direct PostgreSQL connection
 */
async function testPgConnection() {
  logger.info('Testing direct PostgreSQL connection...');
  
  try {
    // Get a client from the pool
    const client = await pool.connect();
    
    try {
      // Try simple query
      const result = await client.query('SELECT 1 as test, NOW() as current_time');
      logger.success('PostgreSQL connection successful!');
      console.log('Query result:', result.rows[0]);
      
      // Check connection information
      const connectionInfo = await client.query(`
        SELECT 
          current_database() as database,
          current_user as user,
          inet_server_addr() as server_address,
          inet_server_port() as server_port,
          version() as postgresql_version
      `);
      console.log('Connection info:', connectionInfo.rows[0]);
      
      // Check connection pool status
      console.log('Pool status:', {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      });
      
      return true;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    logger.error('PostgreSQL connection failed:', error);
    return false;
  } finally {
    await pool.end();
  }
}

/**
 * Test repeated connections to check for intermittent issues
 */
async function testRepeatedConnections(count = 5, delayMs = 1000) {
  logger.info(`Testing ${count} repeated connections with ${delayMs}ms delay...`);
  
  let successes = 0;
  let failures = 0;
  
  for (let i = 0; i < count; i++) {
    logger.info(`Connection test ${i + 1}/${count}...`);
    
    try {
      // Create a new client each time
      const client = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 1,
        connectionTimeoutMillis: 5000,
      });
      
      // Try to connect
      const poolClient = await client.connect();
      await poolClient.query('SELECT 1');
      
      // Release resources
      poolClient.release();
      await client.end();
      
      logger.success(`Connection test ${i + 1} successful`);
      successes++;
    } catch (error) {
      logger.error(`Connection test ${i + 1} failed:`, error);
      failures++;
    }
    
    // Wait before next attempt
    if (i < count - 1) {
      logger.info(`Waiting ${delayMs}ms before next connection test...`);
      await setTimeout(delayMs);
    }
  }
  
  logger.info(`Repeated connection test results: ${successes} successful, ${failures} failed`);
  return { successes, failures };
}

/**
 * Main function
 */
async function main() {
  logger.info('=== DATABASE CONNECTION TEST ===');
  logger.info(`DATABASE_URL: ${process.env.DATABASE_URL?.substr(0, 25)}...`);
  
  try {
    // Test both connection methods
    const prismaSuccess = await testPrismaConnection();
    logger.info('----------------------------');
    const pgSuccess = await testPgConnection();
    
    // If both basic tests pass, try repeated connections
    if (prismaSuccess && pgSuccess) {
      logger.info('----------------------------');
      logger.info('Basic connection tests passed. Testing for intermittent issues...');
      await testRepeatedConnections();
    }
    
    logger.info('=== TEST COMPLETE ===');
  } catch (error) {
    logger.error('Test failed with unexpected error:', error);
    process.exit(1);
  }
}

// Run the test
main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Unhandled error in test:', error);
    process.exit(1);
  }); 