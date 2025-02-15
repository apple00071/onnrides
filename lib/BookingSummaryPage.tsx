import React, { useEffect } from 'react';
import { useBooking } from './BookingContext';

const BookingSummaryPage: React.FC = () => {
    const { bookingId, setBookingId } = useBooking();

    useEffect(() => {
        // Assuming bookingId is passed as a prop or fetched from somewhere
        const fetchedBookingId = '12345'; // Replace with actual fetching logic
        setBookingId(fetchedBookingId);
    }, [setBookingId]);

    return (
        <div>
            <h1>Booking Summary</h1>
            <p>Your booking ID is: {bookingId}</p>
            {/* Other booking details */}
        </div>
    );
};

export default BookingSummaryPage; 