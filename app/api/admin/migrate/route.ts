import { NextResponse } from 'next/server';
import { migrate } from '@/app/lib/migrations';

export async function POST() {
  try {
    await migrate();
    return NextResponse.json({ message: 'Migration completed successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Migration failed' },
      { status: 500 }
    );
  }
} 