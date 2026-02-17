import { query } from '../db';
import logger from '../logger';

/**
 * Checks if a vehicle is already booked for a given time range.
 * 
 * @param vehicleId - The internal UUID of the vehicle
 * @param startDate - The start date/time of the requested booking
 * @param endDate - The end date/time of the requested booking
 * @param excludeBookingId - Optional ID of a booking to exclude (useful for updates)
 * @returns {Promise<boolean>} - True if the vehicle is available, false if there is an overlap
 */
export async function checkVehicleAvailability(
    vehicleId: string,
    startDate: Date | string,
    endDate: Date | string,
    excludeBookingId?: string
): Promise<boolean> {
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        let sql = `
      SELECT COUNT(*) 
      FROM bookings 
      WHERE vehicle_id = $1 
      AND status NOT IN ('cancelled', 'failed')
      AND (
        (start_date <= $2 AND end_date > $2) OR -- Starts during this booking
        (start_date < $3 AND end_date >= $3) OR -- Ends during this booking
        (start_date >= $2 AND end_date <= $3)   -- Entirely within this booking
      )
    `;

        const params: any[] = [vehicleId, start, end];

        if (excludeBookingId) {
            sql += ` AND id != $4`;
            params.push(excludeBookingId);
        }

        const { rows } = await query(sql, params);
        const count = parseInt(rows[0].count);

        return count === 0;
    } catch (error) {
        logger.error('Error checking vehicle availability:', error);
        // Erring on the side of caution: if check fails, assume unavailable
        return false;
    }
}
