import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '@/lib/logger';

const execPromise = promisify(exec);

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === 'admin';
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { command } = data;

    if (!command) {
      return NextResponse.json(
        { error: 'Missing command parameter' },
        { status: 400 }
      );
    }

    // Execute migration command
    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error('Migration error:', stderr);
      return NextResponse.json(
        { error: 'Migration failed', details: stderr },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Migration successful', output: stdout });
  } catch (error) {
    console.error('Error applying migration:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply migration' },
      { status: 500 }
    );
  }
} 