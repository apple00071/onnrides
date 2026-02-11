
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const queryText = `SELECT 1 as test`;
        console.log('Executing test query...');
        const result = await query(queryText);
        console.log('Test query result:', result.rows);

        return NextResponse.json({
            success: true,
            data: result.rows
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message, stack: error.stack }, { status: 200 });
    }
}
