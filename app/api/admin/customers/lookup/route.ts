import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
    try {
        // Verify admin authentication
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const phone = searchParams.get('phone');

        if (!phone) {
            return NextResponse.json(
                { success: false, error: 'Phone number is required' },
                { status: 400 }
            );
        }

        // Clean phone number (keep only digits)
        const cleanedPhone = phone.replace(/\D/g, '');

        // Search for the most recent booking with this phone number
        // We search bookings table because currently that's where the most detailed info is stored
        // We also join with documents to see if we have approved files
        const customerResult = await query(`
      SELECT 
        customer_name as name,
        email,
        phone_number as phone,
        alternate_phone,
        aadhar_number,
        father_number,
        mother_number,
        date_of_birth,
        dl_number,
        dl_expiry_date,
        permanent_address as address,
        dl_scan,
        aadhar_scan,
        selfie,
        user_id
      FROM bookings 
      WHERE (phone_number LIKE $1 OR phone_number LIKE $2)
      ORDER BY created_at DESC 
      LIMIT 1
    `, [`%${cleanedPhone.slice(-10)}`, `%${cleanedPhone}%`]);

        if (customerResult.rows.length === 0) {
            return NextResponse.json({
                success: true,
                data: null,
                message: 'No previous records found for this phone number'
            });
        }

        const customerData = customerResult.rows[0];

        // Check for profile documents if a user_id exists
        let profileDocuments = null;
        if (customerData.user_id) {
            const docsResult = await query(
                'SELECT type, file_url, status FROM documents WHERE user_id = $1 AND status = \'approved\'',
                [customerData.user_id]
            );
            if (docsResult.rows.length > 0) {
                profileDocuments = docsResult.rows.reduce((acc: any, doc: any) => {
                    acc[doc.type] = doc.file_url;
                    return acc;
                }, {});
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                ...customerData,
                profile_documents: profileDocuments
            }
        });

    } catch (error) {
        logger.error('Error looking up customer:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to lookup customer' },
            { status: 500 }
        );
    }
}
