'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FaCheck, FaTimes } from 'react-icons/fa';
<<<<<<< HEAD
=======
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
>>>>>>> 5a6f20b58703b8cab668293ed267069313eed56a
import Image from 'next/image';
import logger from '@/lib/logger';
import { format } from 'date-fns';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  is_blocked: boolean;
  is_verified: boolean;
  created_at: string;
}

interface UserDocument {
  id: string;
  type: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  document_url: string;
  created_at: string;
}

interface Booking {
  id: string;
  status: string;
  created_at: string;
  vehicle: {
    id: string;
    name: string;
    model: string;
    year: number;
    type: string;
    image_url: string;
  };
  start_date: string;
  end_date: string;
  total_amount: number;
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
        setDocuments(docsData);
      }

      if (bookingsResponse.ok) {
        setBookings(bookingsData);
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

  const handleBlockUser = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${user.id}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ blocked: !user.is_blocked })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error('Failed to update user block status');
      }

      const updatedUser = { ...user, is_blocked: !user.is_blocked };
      onUserUpdated(updatedUser);
      toast.success(`User successfully ${user.is_blocked ? 'unblocked' : 'blocked'}`);
    } catch (error) {
      logger.error('Error updating user block status:', error);
      toast.error('Failed to update user block status');
    } finally {
      setLoading(false);
    }
  };

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
<<<<<<< HEAD
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-lg">
=======
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-0 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
        <div className="max-h-[90vh] overflow-y-auto">
>>>>>>> 5a6f20b58703b8cab668293ed267069313eed56a
          {/* Header */}
          <div className="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between">
            <h2 className="text-xl font-semibold">User Details</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <FaTimes className="w-5 h-5" />
            </button>
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
                    <p className="mt-1">{user.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Address</h3>
                    <p className="mt-1">{user.address || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                    <div className="mt-1 space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.is_verified ? 'Verified' : 'Unverified'}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_blocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {user.is_blocked ? 'Blocked' : 'Active'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Joined</h3>
                    <p className="mt-1">{formatDate(user.created_at)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleBlockUser}
                    disabled={loading}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      user.is_blocked
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-red-50 text-red-700 hover:bg-red-100'
                    }`}
                  >
                    {user.is_blocked ? 'Unblock User' : 'Block User'}
                  </button>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-6 pb-4 border-b">
                <h3 className="text-lg font-semibold">Documents</h3>
              </div>
              {documents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50/80 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{doc.type}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                              doc.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(doc.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-3">
                              <a
                                href={doc.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                              >
                                View
                              </a>
                              {doc.status === 'submitted' && (
                                <>
                                  <button
                                    onClick={() => handleDocumentStatus(doc.id, 'approved')}
                                    className="text-green-600 hover:text-green-800"
                                  >
                                    <FaCheck className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDocumentStatus(doc.id, 'rejected')}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <FaTimes className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  No documents submitted yet
                </div>
              )}
            </div>

            {/* Bookings Section */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-6 pb-4 border-b">
                <h3 className="text-lg font-semibold">Bookings</h3>
              </div>
              {bookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {bookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50/80 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0">
                                <div className="relative h-10 w-10 rounded-full overflow-hidden">
                                  <Image
                                    src={booking.vehicle.image_url}
                                    alt={booking.vehicle.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{booking.vehicle.name}</div>
                                <div className="text-sm text-gray-500">{booking.vehicle.type}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <div>From: {formatDate(booking.start_date)}</div>
                              <div>To: {formatDate(booking.end_date)}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                              booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{booking.total_amount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  No bookings found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 