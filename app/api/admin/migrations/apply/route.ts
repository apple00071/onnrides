import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '@/lib/logger';

const prisma = new PrismaClient();
const execPromise = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // Check for admin privileges
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get the request body
    const body = await request.json();
    const { action = 'migrate', force = false } = body;

    // Choose the appropriate migration command based on the action
    let command: string;
    switch (action) {
      case 'reset':
        command = `npx prisma migrate reset ${force ? '--force' : ''}`;
        break;
      case 'deploy':
        command = 'npx prisma migrate deploy';
        break;
      case 'rollback':
        command = 'npx prisma migrate resolve --rolled-back';
        break;
      case 'status':
        command = 'npx prisma migrate status';
        break;
      default:
        command = 'npx prisma migrate dev';
    }

    logger.info(`Executing migration command: ${command}`);

    // Execute the command
    const { stdout, stderr } = await execPromise(command);

    // Log the results
    if (stdout) logger.info(stdout);
    if (stderr) logger.error(stderr);

    return NextResponse.json({
      success: true,
      action,
      force,
      result: {
        stdout,
        stderr
      }
    });
  } catch (error) {
    logger.error('Error executing migration command:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to execute migration command',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 