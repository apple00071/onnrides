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
       WHERE TO_CHAR(created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') = $1 AND status = 'completed'
       GROUP BY method`,
            [date]
        );

        let cashCollections = 0;
        let cardCollections = 0;
        let upiCollections = 0;
        let bankCollections = 0;
        let onlineCollections = 0;
        let totalCollections = 0;

        collectionsResult.rows.forEach((row: any) => {
            const method = row.method?.toLowerCase();
            const total = parseFloat(String(row.total || '0'));
            totalCollections += total;

            if (method === 'cash') cashCollections = total;
            else if (method === 'card') cardCollections = total;
            else if (method === 'upi') upiCollections = total;
            else if (method === 'bank_transfer') bankCollections = total;
            else onlineCollections += total; // Group all other (razorpay, online, etc.)
        });

        // 3. Get Today's Expenses
        const expensesResult = await query(
            `SELECT id, amount, description, created_at 
             FROM expenses 
             WHERE TO_CHAR(created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') = $1`,
            [date]
        );
        const totalExpenses = expensesResult.rows.reduce((sum, row: any) => sum + parseFloat(String(row.amount || '0')), 0);

        // 4. Get Refunds
        const refundsResult = await query(
            `SELECT id, amount, booking_id, created_at 
             FROM payments 
             WHERE TO_CHAR(created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') = $1 
             AND status = 'refunded'`,
            [date]
        );
        const totalRefunds = refundsResult.rows.reduce((sum, row: any) => sum + parseFloat(String(row.amount || '0')), 0);

        // Calculate closing balance
        const closingBalance = Math.round((openingBalance + totalCollections - totalRefunds - totalExpenses) * 100) / 100;

        // 6. Get Collections List for Transactions
        const collectionsResultList = await query(
            `SELECT 
                p.id,
                p.booking_id,
                COALESCE(b.customer_name, u.name, 'Customer') as customer_name,
                p.amount,
                p.method as payment_method,
                CASE WHEN LOWER(p.status) = 'refunded' THEN 'refund' ELSE 'collection' END as type,
                p.created_at as timestamp
            FROM payments p
            LEFT JOIN bookings b ON p.booking_id = b.id
            LEFT JOIN users u ON b.user_id = u.id
            WHERE TO_CHAR(p.created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') = $1
            ORDER BY p.created_at DESC`,
            [date]
        );

        // Map everything together for transactions
        const transactions = [
            ...collectionsResultList.rows.map((r: any) => ({ ...r, amount: parseFloat(String(r.amount)) })),
            ...expensesResult.rows.map((r: any) => ({
                id: r.id,
                customer_name: 'Expense',
                amount: parseFloat(String(r.amount)),
                payment_method: 'Cash',
                type: 'expense',
                timestamp: r.created_at
            }))
        ].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return NextResponse.json({
            success: true,
            data: {
                cashFlow: {
                    openingBalance,
                    cashCollections,
                    cardCollections,
                    upiCollections,
                    bankCollections,
                    onlineCollections,
                    cashRefunds: totalRefunds,
                    totalRefunds,
                    expenses: totalExpenses,
                    totalCollections,
                    closingBalance,
                    lastReconciled: openingBalanceResult.rows[0] ? date : null
                },
                transactions
            }
        });

    } catch (error) {
        logger.error('Error fetching daily finance data:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
