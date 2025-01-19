'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FaCheck, FaTimes } from 'react-icons/fa';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import Image from 'next/image';
import logger from '../../../lib/logger';
import { format } from 'date-fns';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  created_at: string;
  documents_status?: {
    approved: number;
    total: number;
  };
}

interface UserDocument {
  id: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  url: string;
  created_at: string;
  rejection_reason?: string;
}

interface Booking {
  id: string;
  status: string;
  payment_status: string;
  created_at: string;
  vehicle: {
    id: string;
    name: string;
    type: string;
    images: string[];
  };
  start_date: string;
  end_date: string;
  total_price: number;
}

interface UserDetailsModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: (updatedUser: User) => void;
}

export default function UserDetailsModal({ user, isOpen, onClose, onUserUpdated }: UserDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const fetchUserData = useCallback(async () => {
    if (!user) return;

    try {
      const [docsResponse, bookingsResponse] = await Promise.all([
        fetch(`/api/admin/users/${user.id}/documents`),
        fetch(`/api/admin/users/${user.id}/bookings`)
      ]);

      const docsData = await docsResponse.json();
      const bookingsData = await bookingsResponse.json();

      if (docsResponse.ok) {
        setDocuments(docsData.documents);
      }

      if (bookingsResponse.ok) {
        setBookings(bookingsData.bookings);
      }
    } catch (error) {
      logger.error('Error fetching user data:', error);
      toast.error('Failed to fetch user data');
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      fetchUserData();
    } else {
      setDocuments([]);
      setBookings([]);
    }
  }, [isOpen, user, fetchUserData]);

  const handleDocumentStatus = async (documentId: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/admin/documents/${documentId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error('Failed to update document status');
      }

      setDocuments(prevDocs => 
        prevDocs.map(doc => 
          doc.id === documentId ? { ...doc, status } : doc
        )
      );

      toast.success(`Document ${status} successfully`);

      const updatedData = await response.json();
      if (updatedData.user) {
        onUserUpdated(updatedData.user);
      }
    } catch (error) {
      logger.error('Error updating document status:', error);
      toast.error('Failed to update document status');
    }
  };

  if (!user || !isOpen) return null;

  const formatDate = (date: string) => {
    return format(new Date(date), 'MMM d, yyyy HH:mm:ss');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
        <div className="max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">User Details</h2>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* User Info Section */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Name</h3>
                    <p className="mt-1">{user.name || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Email</h3>
                    <p className="mt-1">{user.email}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                    <p className="mt-1">{user.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Role</h3>
                    <p className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Documents</h3>
                    <p className="mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {user.documents_status?.approved || 0}/{user.documents_status?.total || 0} Approved
                      </span>
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Joined</h3>
                    <p className="mt-1">{formatDate(user.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-6 pb-4 border-b">
                <h3 className="text-lg font-semibold">Documents</h3>
              </div>
              <div className="p-6">
                {documents.length === 0 ? (
                  <p className="text-gray-500">No documents found</p>
                ) : (
                  <div className="space-y-4">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium capitalize">{doc.type}</p>
                          <p className="text-sm text-gray-500">{formatDate(doc.created_at)}</p>
                          {doc.rejection_reason && (
                            <p className="text-sm text-red-500 mt-1">Reason: {doc.rejection_reason}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            View Document
                          </a>
                          {doc.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleDocumentStatus(doc.id, 'approved')}
                                className="p-2 text-green-600 hover:text-green-800"
                              >
                                <FaCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDocumentStatus(doc.id, 'rejected')}
                                className="p-2 text-red-600 hover:text-red-800"
                              >
                                <FaTimes className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            doc.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : doc.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bookings Section */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-6 pb-4 border-b">
                <h3 className="text-lg font-semibold">Bookings</h3>
              </div>
              <div className="p-6">
                {bookings.length === 0 ? (
                  <p className="text-gray-500">No bookings found</p>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between border-b pb-4 last:border-b-0 last:pb-0">
                        <div>
                          <div className="flex items-center space-x-4">
                            {booking.vehicle.images[0] && (
                              <div className="relative w-16 h-16">
                                <Image
                                  src={booking.vehicle.images[0]}
                                  alt={booking.vehicle.name}
                                  fill
                                  className="object-cover rounded-md"
                                />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{booking.vehicle.name}</p>
                              <p className="text-sm text-gray-500">{booking.vehicle.type}</p>
                            </div>
                          </div>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm">
                              <span className="text-gray-500">From:</span> {formatDate(booking.start_date)}
                            </p>
                            <p className="text-sm">
                              <span className="text-gray-500">To:</span> {formatDate(booking.end_date)}
                            </p>
                            <p className="text-sm">
                              <span className="text-gray-500">Total:</span> ₹{booking.total_price}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            booking.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : booking.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {booking.status}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            booking.payment_status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : booking.payment_status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            Payment: {booking.payment_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 