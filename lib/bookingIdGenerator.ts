import { query } from './db';

export const generateBookingId = async (): Promise<string> => {
    try {
        // Get the latest booking ID from the database
        const result = await query(
            `SELECT booking_id 
             FROM bookings 
             WHERE booking_id LIKE 'OR%' 
             ORDER BY CAST(SUBSTRING(booking_id FROM 3) AS INTEGER) DESC 
             LIMIT 1`
        );

        let lastNumber = 717; // Default starting number
        
        if (result.rows.length > 0) {
            // Extract the number from the last booking ID (e.g., 'OR718' -> 718)
            const lastBookingId = result.rows[0].booking_id;
            const matches = lastBookingId.match(/OR(\d+)/);
            if (matches && matches[1]) {
                lastNumber = parseInt(matches[1], 10);
            }
        }

        // Generate the next booking ID
        const nextNumber = lastNumber + 1;
        return `OR${nextNumber}`;
    } catch (error) {
        console.error('Error generating booking ID:', error);
        throw new Error('Failed to generate booking ID');
    }
}; 