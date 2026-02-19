
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, verifyAdmin } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        const isAdmin = await verifyAdmin(request);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await query(
            `SELECT id, name, email, phone, role, permissions, created_at 
       FROM users 
       WHERE role IN ('admin', 'staff') 
       ORDER BY created_at DESC`
        );

        return NextResponse.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching staff:', error);
        return NextResponse.json(
            { error: 'Failed to fetch staff' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const isAdmin = await verifyAdmin(request);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, email, phone, password, permissions } = body;

        // Validate email uniqueness
        const existingUser = await query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return NextResponse.json(
                { error: 'Email already exists' },
                { status: 400 }
            );
        }

        const hashedPassword = await hashPassword(password);
        const id = uuidv4();

        await query(
            `INSERT INTO users (
        id, name, email, phone, password_hash, role, permissions, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'staff', $6, NOW(), NOW())`,
            [id, name, email, phone, hashedPassword, permissions]
        );

        return NextResponse.json({
            success: true,
            data: { id, name, email }
        });
    } catch (error) {
        console.error('Error creating staff:', error);
        return NextResponse.json(
            { error: 'Failed to create staff member' },
            { status: 500 }
        );
    }
}
