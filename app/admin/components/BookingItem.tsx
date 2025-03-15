import React from 'react';
import { format } from 'date-fns';
import Link from 'next/link';

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface BookingItemProps {
  id: string;
  userName: string;
  userEmail: string;
  vehicleName: string;
  startDate: Date | string;
  endDate?: Date | string;
  status: BookingStatus;
  amount?: number;
  currency?: string;
}

export default function BookingItem({
  id,
  userName,
  userEmail,
  vehicleName,
  startDate,
  endDate,
  status,
  amount,
  currency = '₹'
}: BookingItemProps) {
  // Format dates
  const formattedStartDate = typeof startDate === 'string' 
    ? startDate 
    : format(startDate, 'dd MMM yyyy');
  
  const formattedEndDate = endDate 
    ? (typeof endDate === 'string' ? endDate : format(endDate, 'dd MMM yyyy'))
    : null;

  // Status colors
  const statusColors: Record<BookingStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  return (
    <Link 
      href={`/admin/bookings/${id}`}
      className="block bg-white rounded-lg border border-gray-200 p-4 mb-2 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{userName}</h3>
          <p className="text-sm text-gray-500">{userEmail}</p>
        </div>
        
        <div className="ml-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
      </div>
      
      <div className="flex items-center mb-1">
        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 mr-2">
          🚗
        </div>
        <span className="text-sm font-medium text-gray-900">{vehicleName}</span>
      </div>
      
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <div className="flex flex-col">
          <span className="font-medium">Start</span>
          <span>{formattedStartDate}</span>
        </div>
        
        {formattedEndDate && (
          <div className="flex flex-col">
            <span className="font-medium">End</span>
            <span>{formattedEndDate}</span>
          </div>
        )}
        
        {amount && (
          <div className="flex flex-col">
            <span className="font-medium">Amount</span>
            <span className="text-gray-900 font-semibold">{currency}{amount}</span>
          </div>
        )}
      </div>
      
      <div className="flex justify-end mt-3">
        <button className="text-xs text-orange-600 font-medium">View Details &rarr;</button>
      </div>
    </Link>
  );
} 