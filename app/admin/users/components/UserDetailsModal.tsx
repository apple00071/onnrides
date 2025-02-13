'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { FaCheck, FaTimes, FaEye, FaBan } from 'react-icons/fa';
import logger from '@/lib/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { format } from 'date-fns';
import { User } from '@/lib/types';
import { FileIcon } from 'lucide-react';

interface UserDocument {
  id: string;
  user_id: string;
  type: string;
  file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

interface Booking {
  id: string;
  user_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  payment_status: string;
  payment_intent_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  vehicle?: {
    id: string;
    name: string;
    type: string;
    images: string[];
  };
}

interface UserDetailsModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: (user: User) => void;
}

interface CancelBookingModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

function DocumentViewerModal({ 
  isOpen, 
  onClose, 
  document 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  document: UserDocument | null;
}) {
  if (!document) return null;

  logger.info('Document viewer data:', {
    documentId: document.id,
    type: document.type,
    hasFileUrl: !!document.file_url,
    fileUrl: document.file_url
  });

  if (!document.file_url) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Document Error</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <div className="text-center space-y-2">
              <p className="text-red-500 font-medium">Document URL is missing</p>
              <p className="text-sm text-gray-500">
                The document {document.type} (ID: {document.id}) has no associated file URL.
                Please contact support if this issue persists.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const fileUrl = document.file_url;
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);
  const isPDF = fileUrl.toLowerCase().endsWith('.pdf');
  const fileName = fileUrl.split('/').pop() || document.type;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div>
              {document.type}
              <span className="ml-2 text-sm text-gray-500">
                ({isImage ? 'Image' : isPDF ? 'PDF' : fileName})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                Open in New Tab
              </a>
              <a
                href={fileUrl}
                download={fileName}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                Download
              </a>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 overflow-auto max-h-[calc(90vh-100px)]">
          {isImage ? (
            <div className="relative w-full h-[600px]">
              <img
                src={fileUrl}
                alt={document.type}
                className="w-full h-full object-contain"
                onError={() => {
                  logger.error('Failed to load image:', {
                    documentId: document.id,
                    type: document.type,
                    url: fileUrl
                  });
                  toast.error('Failed to load image');
                }}
              />
            </div>
          ) : isPDF ? (
            <object
              data={`${fileUrl}#view=FitH`}
              type="application/pdf"
              className="w-full h-[600px]"
            >
              <p>Unable to display PDF. <a href={fileUrl} target="_blank" rel="noopener noreferrer">Click here to open it</a></p>
            </object>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="text-gray-500">
                <FileIcon className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg font-medium">This file type cannot be previewed directly</p>
                <p className="text-sm text-gray-400 mt-2">
                  Please use the buttons above to open or download the file
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CancelBookingModal({ booking, isOpen, onClose, onConfirm, loading }: CancelBookingModalProps) {
  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Booking</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel this booking for {booking.vehicle?.name}?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm">
            <p><span className="font-medium">Booking ID:</span> {booking.id}</p>
            <p><span className="font-medium">Vehicle:</span> {booking.vehicle?.name}</p>
            <p><span className="font-medium">From:</span> {format(new Date(booking.start_date), 'PPP')}</p>
            <p><span className="font-medium">To:</span> {format(new Date(booking.end_date), 'PPP')}</p>
            <p><span className="font-medium">Amount:</span> ₹{booking.total_price}</p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">◌</span>
                Cancelling...
              </>
            ) : (
              'Confirm Cancellation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UserDetailsModal({ user, isOpen, onClose, onUserUpdated }: UserDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null);
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchUserData = useCallback(async () => {
    if (!user) return;

    try {
      const [docsResponse, bookingsResponse] = await Promise.all([
        fetch(`/api/admin/users/${user.id}/documents`),
        fetch(`/api/admin/users/${user.id}/bookings`)
      ]);

      const docsData = await docsResponse.json();
      const bookingsData = await bookingsResponse.json();

      logger.info('Documents response:', {
        success: docsData.success,
        documents: docsData.documents,
        status: docsResponse.status
      });

      if (docsResponse.ok && docsData.success) {
        setDocuments(docsData.documents || []);
        logger.info('Set documents:', docsData.documents);
      } else {
        setDocuments([]);
        if (!docsResponse.ok) {
          toast.error('Failed to fetch documents');
        }
      }

      if (bookingsResponse.ok && bookingsData.success) {
        setBookings(bookingsData.data || []);
      } else {
        setBookings([]);
        if (!bookingsResponse.ok) {
          toast.error('Failed to fetch bookings');
        }
      }
    } catch (error) {
      logger.error('Error fetching user data:', error);
      toast.error('Failed to fetch user data');
      setDocuments([]);
      setBookings([]);
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
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/documents`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documentId, status })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update document status');
      }

      if (data.success) {
        setDocuments(prevDocs => 
          prevDocs.map(doc => 
            doc.id === documentId ? { ...doc, status } : doc
          )
        );

        toast.success(`Document ${status} successfully`);

        // Update user if document status affects user verification
        if (data.data?.user_verified !== undefined) {
          const currentTotal = user.documents?.total ?? documents.length;
          onUserUpdated({
            ...user,
            documents: {
              ...user.documents,
              approved: status === 'approved' 
                ? (user.documents?.approved || 0) + 1 
                : Math.max(0, (user.documents?.approved || 0) - 1),
              total: currentTotal
            }
          });
        }
      } else {
        throw new Error(data.error || 'Failed to update document status');
      }
    } catch (error) {
      logger.error('Error updating document status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update document status');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking || !user) return;
    
    setCancelLoading(true);
    try {
      const response = await fetch(`/api/admin/bookings/${selectedBooking.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel booking');
      }

      if (data.success) {
        // Update the booking status in the list
        setBookings(prevBookings =>
          prevBookings.map(booking =>
            booking.id === selectedBooking.id
              ? { ...booking, status: 'cancelled' }
              : booking
          )
        );

        toast.success('Booking cancelled successfully');
        setIsCancelModalOpen(false);
      } else {
        throw new Error(data.error || 'Failed to cancel booking');
      }
    } catch (error) {
      logger.error('Error cancelling booking:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel booking');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          documents: user.documents,
          is_blocked: user.is_blocked
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      const updatedUser = await response.json();
      onUserUpdated(updatedUser);
      toast.success('User updated successfully');
    } catch (error) {
      logger.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  if (!user || !isOpen) return null;

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'MMM d, yyyy HH:mm:ss');
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <>
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
                          {user.documents?.approved || 0}/{user.documents?.total || 0} Approved
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
                            <button
                              onClick={() => {
                                setSelectedDocument(doc);
                                setIsDocumentViewerOpen(true);
                              }}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              <FaEye className="w-4 h-4 mr-1" />
                              View
                            </button>
                            {doc.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleDocumentStatus(doc.id, 'approved')}
                                  className="p-2 text-green-600 hover:text-green-800"
                                  disabled={loading}
                                >
                                  <FaCheck className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDocumentStatus(doc.id, 'rejected')}
                                  className="p-2 text-red-600 hover:text-red-800"
                                  disabled={loading}
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
                              {booking.vehicle?.images[0] && (
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
                                <p className="font-medium">{booking.vehicle?.name}</p>
                                <p className="text-sm text-gray-500">{booking.vehicle?.type}</p>
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
                            {booking.status === 'confirmed' && (
                              <button
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setIsCancelModalOpen(true);
                                }}
                                className="inline-flex items-center px-2 py-1 text-sm font-medium text-red-600 hover:text-red-800"
                                title="Cancel Booking"
                              >
                                <FaBan className="w-4 h-4 mr-1" />
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Documents Status */}
              <div className="mt-4">
                <h3 className="text-lg font-medium">Documents Status</h3>
                <p className="text-sm text-gray-500">
                  {user.documents ? (
                    `${user.documents.approved}/${user.documents.total} documents approved`
                  ) : (
                    'No documents uploaded'
                  )}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DocumentViewerModal
        isOpen={isDocumentViewerOpen}
        onClose={() => {
          setIsDocumentViewerOpen(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
      />

      <CancelBookingModal
        booking={selectedBooking}
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setSelectedBooking(null);
        }}
        onConfirm={handleCancelBooking}
        loading={cancelLoading}
      />
    </>
  );
} 