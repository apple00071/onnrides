import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { QueryResultRow } from 'pg';

interface CollectionRow extends QueryResultRow {
    method: string;
    total: string | number;
}

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { searchParams } = new URL(request.url);

        // Use IST date as default if no date provided
        const now = new Date();
        const istDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(now); // Returns YYYY-MM-DD

        const date = searchParams.get('date') || istDate;

        // 1. Get Opening Balance (Closing balance of the previous reconciled day)
        const openingBalanceResult = await query(
            'SELECT closing_balance FROM daily_reconciliations WHERE date < $1 ORDER BY date DESC LIMIT 1',
            [date]
        );
        const openingBalance = parseFloat(openingBalanceResult.rows[0]?.closing_balance || '0');

        // 2. Get Collections by Method
        const collectionsResult = await query(
            `SELECT method, SUM(amount) as total 
       FROM payments 
       WHERE DATE(created_at) = $1 AND status = 'completed'
       GROUP BY method`,
            [date]
        );

        let cashCollections = 0;
        let cardCollections = 0;
        let upiCollections = 0;
        let bankCollections = 0;

        collectionsResult.rows.forEach((row: any) => {
            const method = row.method?.toLowerCase();
            const total = parseFloat(String(row.total || '0'));
            if (method === 'cash') cashCollections = total;
            else if (method === 'card') cardCollections = total;
            else if (method === 'upi') upiCollections = total;
            else if (method === 'bank_transfer') bankCollections = total;
        });

        // 3. Get Expenses
        const expensesResult = await query(
            'SELECT SUM(amount) as total FROM expenses WHERE date = $1',
            [date]
        );
        const expenses = parseFloat(expensesResult.rows[0]?.total || '0');

        // 4. Get Refunds (All methods)
        // Note: Refunds are stored as negative amounts in the payments table
        const refundsResult = await query(
            "SELECT SUM(amount) as total FROM payments WHERE DATE(created_at) = $1 AND status = 'refunded'",
            [date]
        );
        const totalRefunds = parseFloat(refundsResult.rows[0]?.total || '0'); // This will be negative

        // 5. Aggregation with Rounding
        const totalCollections = Math.round((cashCollections + cardCollections + upiCollections + bankCollections) * 100) / 100;

        // Calculate closing balance: Opening + Collections + Refunds (negative) - Expenses
        const closingBalance = Math.round((openingBalance + totalCollections + totalRefunds - expenses) * 100) / 100;

        // 6. Get Transactions List
        const transactionsResult = await query(
            `SELECT 
        p.id,
        p.booking_id,
        COALESCE(b.customer_name, u.name, 'Customer') as customer_name,
        p.amount,
        p.method as payment_method,
        CASE WHEN p.status = 'refunded' THEN 'refund' ELSE 'collection' END as type,
        p.created_at as timestamp
       FROM payments p
       LEFT JOIN bookings b ON p.booking_id = b.id
       LEFT JOIN users u ON b.user_id = u.id
       WHERE DATE(p.created_at) = $1
       ORDER BY p.created_at DESC`,
            [date]
        );

        return NextResponse.json({
            success: true,
            data: {
                cashFlow: {
                    openingBalance,
                    cashCollections,
                    cardCollections,
                    upiCollections,
                    bankCollections,
                    totalRefunds,
                    expenses,
                    totalCollections,
                    closingBalance,
                    lastReconciled: openingBalanceResult.rows[0] ? date : null
                },
                transactions: transactionsResult.rows
            }
        });

    } catch (error) {
        logger.error('Error fetching daily finance data:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
