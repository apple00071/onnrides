'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FaCheck, FaTimes } from 'react-icons/fa';
import { Dialog } from '@/components/ui/dialog';
import { User, Document, Booking } from '../types';

interface UserDetailsModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: (updatedUser: User) => void;
}

export default function UserDetailsModal({ user, isOpen, onClose, onUserUpdated }: UserDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const fetchUserData = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch documents
      const docsResponse = await fetch(`/api/admin/users/${user.id}/documents`);
      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        setDocuments(docsData);
      }

      // Fetch bookings
      const bookingsResponse = await fetch(`/api/admin/users/${user.id}/bookings`);
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json();
        setBookings(bookingsData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to fetch user data');
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      fetchUserData();
    } else {
      // Reset state when modal closes or user changes
      setDocuments([]);
      setBookings([]);
    }
  }, [isOpen, user, fetchUserData]);

  const handleBlockUser = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${user.id}/block`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: !user.is_blocked })
      });

      if (!response.ok) {
        throw new Error('Failed to update user block status');
      }

      const updatedUser = await response.json();
      onUserUpdated(updatedUser);
      toast.success(`User successfully ${user.is_blocked ? 'unblocked' : 'blocked'}`);
    } catch (error) {
      console.error('Error updating user block status:', error);
      toast.error('Failed to update user block status');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentStatus = async (documentId: string, status: 'approved' | 'rejected') => {
    if (!user) return;
    try {
      const response = await fetch(`/api/admin/users/${user.id}/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update document status');
      }

      const result = await response.json();
      
      // Update the documents list with the new status
      setDocuments(prevDocs => 
        prevDocs.map(doc => 
          doc.id === documentId ? { ...doc, status } : doc
        )
      );

      // Show success message
      toast.success(`Document ${status} successfully`);

      // Update the user data if it was returned
      if (result.user) {
        onUserUpdated(result.user);
      }
    } catch (error) {
      console.error('Error updating document status:', error);
      toast.error('Failed to update document status');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="px-6 py-4 border-b">
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
                              doc.status === 'approved' ? 'bg-green-100 text-green-800 border border-green-200' :
                                doc.status === 'rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                                  'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            }`}>
                              {doc.status === 'submitted' ? 'Pending' : 
                                doc.status === 'pending' ? 'Pending' : 
                                  doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(doc.created_at)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200 mr-4"
                            >
                              View
                            </a>
                            {(doc.status === 'pending' || doc.status === 'submitted') && (
                              <>
                                <button
                                  onClick={() => handleDocumentStatus(doc.id, 'approved')}
                                  className="text-green-600 hover:text-green-800 transition-colors duration-200 p-1 rounded-full hover:bg-green-50"
                                  title="Approve Document"
                                >
                                  <FaCheck className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDocumentStatus(doc.id, 'rejected')}
                                  className="text-red-600 hover:text-red-800 transition-colors duration-200 p-1 rounded-full hover:bg-red-50"
                                  title="Reject Document"
                                >
                                  <FaTimes className="w-4 h-4" />
                                </button>
                              </>
                            )}
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
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={booking.vehicle.image_url}
                                  alt={booking.vehicle.name}
                                />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{booking.vehicle.name}</div>
                                <div className="text-sm text-gray-500">{booking.vehicle.type}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatDate(booking.start_date)}</div>
                            <div className="text-sm text-gray-500">to</div>
                            <div className="text-sm text-gray-900">{formatDate(booking.end_date)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              booking.status === 'completed' ? 'bg-green-100 text-green-800 border border-green-200' :
                                booking.status === 'cancelled' ? 'bg-red-100 text-red-800 border border-red-200' :
                                  booking.status === 'active' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                    'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            }`}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
} 