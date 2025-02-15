import React, { createContext, useContext, useState } from 'react';

// Create a context for booking ID
const BookingContext = createContext<{ bookingId: string; setBookingId: (id: string) => void } | undefined>(undefined);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [bookingId, setBookingId] = useState<string>('');

    return (
        <BookingContext.Provider value={{ bookingId, setBookingId }}>
            {children}
        </BookingContext.Provider>
    );
};

export const useBooking = () => {
    const context = useContext(BookingContext);
    if (!context) {
        throw new Error('useBooking must be used within a BookingProvider');
    }
    return context;
}; 