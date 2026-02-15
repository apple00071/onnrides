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

        // Get DB User ID for reconciled_by
        const userResult = await query('SELECT id FROM users WHERE email = $1', [session.user.email]);
        const userId = userResult.rows[0]?.id;

        if (!userId) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        const body = await request.json();
        const { closingBalance, date } = body;

        const queryDate = date || new Date().toISOString().split('T')[0];

        // 1. Re-calculate expected balance to ensure data integrity
        // openingBalance
        const openingBalanceRes = await query(
            'SELECT closing_balance FROM daily_reconciliations WHERE date < $1 ORDER BY date DESC LIMIT 1',
            [queryDate]
        );
        const openingBalance = parseFloat(openingBalanceRes.rows[0]?.closing_balance || '0');

        // collections
        const collectionsRes = await query(
            `SELECT SUM(amount) as total FROM payments WHERE DATE(created_at) = $1 AND status = 'completed'`,
            [queryDate]
        );
        const totalCollections = parseFloat(collectionsRes.rows[0]?.total || '0');

        // refunds
        const refundsRes = await query(
            `SELECT SUM(amount) as total FROM payments WHERE DATE(created_at) = $1 AND status = 'refunded' AND method = 'cash'`,
            [queryDate]
        );
        const cashRefunds = parseFloat(refundsRes.rows[0]?.total || '0');

        // expenses
        const expensesRes = await query(
            'SELECT SUM(amount) as total FROM expenses WHERE date = $1',
            [queryDate]
        );
        const expensesTotal = parseFloat(expensesRes.rows[0]?.total || '0');

        const expectedBalance = openingBalance + totalCollections - cashRefunds - expensesTotal;
        const difference = closingBalance - expectedBalance;
        const status = difference === 0 ? 'balanced' : 'discrepancy';

        // 2. Aggregate method-specific collections for individual columns
        const methodsRes = await query(
            `SELECT method, SUM(amount) as total FROM payments WHERE DATE(created_at) = $1 AND status = 'completed' GROUP BY method`,
            [queryDate]
        );

        let cash_collections = 0;
        let card_collections = 0;
        let upi_collections = 0;

        methodsRes.rows.forEach((row: any) => {
            const m = row.method?.toLowerCase();
            const val = parseFloat(row.total || '0');
            if (m === 'cash') cash_collections = val;
            else if (m === 'card') card_collections = val;
            else if (m === 'upi') upi_collections = val;
        });

        // 3. Upsert reconciliation
        await query(
            `INSERT INTO daily_reconciliations (
        id, date, opening_balance, cash_collections, card_collections, upi_collections, 
        cash_refunds, expenses_total, closing_balance, expected_balance, difference, reconciled_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (date) DO UPDATE SET
        opening_balance = EXCLUDED.opening_balance,
        cash_collections = EXCLUDED.cash_collections,
        card_collections = EXCLUDED.card_collections,
        upi_collections = EXCLUDED.upi_collections,
        cash_refunds = EXCLUDED.cash_refunds,
        expenses_total = EXCLUDED.expenses_total,
        closing_balance = EXCLUDED.closing_balance,
        expected_balance = EXCLUDED.expected_balance,
        difference = EXCLUDED.difference,
        reconciled_by = EXCLUDED.reconciled_by,
        created_at = CURRENT_TIMESTAMP`,
            [
                randomUUID(), queryDate, openingBalance, cash_collections, card_collections, upi_collections,
                cashRefunds, expensesTotal, closingBalance, expectedBalance, difference, userId
            ]
        );

        logger.info('Daily reconciliation completed', { date: queryDate, difference });

        return NextResponse.json({ success: true });

    } catch (error) {
        logger.error('Error in reconciliation:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
