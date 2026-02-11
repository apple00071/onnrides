import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { query } from '@/lib/db';
import { randomUUID } from 'crypto';
import logger from '@/lib/logger';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        const { amount, description, date } = body;

        if (!amount || !description) {
            return NextResponse.json({ success: false, error: 'Amount and description are required' }, { status: 400 });
        }

        const expenseId = randomUUID();
        await query(
            `INSERT INTO expenses (id, amount, description, date, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
            [expenseId, amount, description, date || new Date().toISOString().split('T')[0]]
        );

        logger.info('Expense recorded successfully', { expenseId, amount });

        return NextResponse.json({ success: true, id: expenseId });

    } catch (error) {
        logger.error('Error recording expense:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
