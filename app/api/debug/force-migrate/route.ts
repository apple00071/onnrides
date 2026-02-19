
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
    `);
        return NextResponse.json({ success: true, message: 'Permissions column added successfully' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
