
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword, verifyAdmin } from '@/lib/auth';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const isAdmin = await verifyAdmin(request);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, phone, password, permissions } = body;
        const { id } = params;

        // Build update query dynamically
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (name) {
            updates.push(`name = $${paramIndex}`);
            values.push(name);
            paramIndex++;
        }
        if (phone !== undefined) {
            updates.push(`phone = $${paramIndex}`);
            values.push(phone);
            paramIndex++;
        }
        if (permissions) {
            updates.push(`permissions = $${paramIndex}`);
            values.push(permissions);
            paramIndex++;
        }
        if (password) {
            const hashedPassword = await hashPassword(password);
            updates.push(`password_hash = $${paramIndex}`);
            values.push(hashedPassword);
            paramIndex++;
        }

        if (updates.length === 0) {
            return NextResponse.json({ success: true });
        }

        values.push(id);
        const sql = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = NOW() 
      WHERE id = $${paramIndex} AND role IN ('staff', 'admin')
    `;

        await query(sql, values);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating staff:', error);
        return NextResponse.json(
            { error: 'Failed to update staff member' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const isAdmin = await verifyAdmin(request);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        // Prevent deleting self (though UI should handle this too)
        // For now, just ensure we are deleting a staff/admin row
        await query(
            "DELETE FROM users WHERE id = $1 AND role IN ('staff', 'admin')",
            [id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting staff:', error);
        return NextResponse.json(
            { error: 'Failed to delete staff member' },
            { status: 500 }
        );
    }
}
