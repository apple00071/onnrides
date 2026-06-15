'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Loader2, 
  ArrowLeft, 
  UserCircle, 
  Mail, 
  Phone, 
  Calendar, 
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  XCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Eye,
  FileText
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  is_blocked: boolean;
  documents?: {
    id: string;
    type: string;
    file_url: string;
    status: string;
    rejection_reason?: string;
    created_at: string;
    updated_at: string;
  }[];
  bookings?: {
    id: string;
    booking_id: string;
    vehicle: {
      name: string;
      type: string;
    };
    start_date: string;
    end_date: string;
    total_price: number;
    status: string;
    payment_status: string;
    created_at: string;
  }[];
  trip_data?: {
    total_trips: number;
    completed_trips: number;
    cancelled_trips: number;
    total_spent: number;
    favorite_vehicle_type?: string;
  };
}

export default function UserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Check auth status first
    if (sessionStatus === 'loading') return;
    
    if (sessionStatus === 'unauthenticated' || session?.user?.role !== 'admin') {
      toast.error('Please sign in with admin privileges to access this page');
      router.push('/auth/signin?callbackUrl=/admin/dashboard');
      return;
    }

    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/admin/users/${params.userId}?include=bookings,tripData`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('User not found');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to view this user');
          }
          throw new Error('Failed to fetch user details');
        }

        const data = await response.json();
        if (isMounted) {
          setUser(data);
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'An error occurred';
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (params.userId) {
      fetchUserDetails();
    }

    return () => {
      isMounted = false;
    };
  }, [params.userId, sessionStatus, session, router]);

  const handleUpdateDocumentStatus = async (documentId: string, status: 'approved' | 'rejected') => {
    if (!user) return;
    try {
      const response = await fetch(`/api/admin/users/${user.id}/documents`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documentId, status })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update document status');

      if (data.success) {
        setUser(prevUser => {
          if (!prevUser) return null;
          return {
            ...prevUser,
            documents: prevUser.documents?.map(doc => 
              doc.id === documentId ? { ...doc, status } : doc
            )
          };
        });
        toast.success(`Document ${status} successfully`);
      } else {
        throw new Error(data.error || 'Failed to update document status');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update document status');
    }
  };

  // Show loading state with better UI feedback
  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-gray-600">Loading user details...</p>
      </div>
    );
  }

  // Handle unauthorized access
  if (sessionStatus === 'unauthenticated' || session?.user?.role !== 'admin') {
    return null;
  }

  // Handle error state with better UI feedback
  if (error || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Card className="p-6 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-600 mb-4">{error || 'User not found'}</p>
            <div className="space-y-4">
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
              <Button 
                onClick={() => router.push('/admin/users')}
                className="w-full"
              >
                Return to Users List
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2 w-full">
      <div className="mb-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-primary hover:text-primary/80 flex items-center gap-2 p-0 h-auto font-bold text-xs md:text-sm tracking-tight"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Users</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Profile Card & Documents */}
        <div className="lg:col-span-1 space-y-6">
          {/* User Profile Card */}
          <Card className="bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.015)] overflow-hidden">
            <CardContent className="p-6">
              <div className="relative flex flex-col items-center pb-6 border-b border-slate-100/80">
                <div className="h-20 w-20 rounded-full bg-orange-50 border-2 border-orange-200 text-[#f26e24] flex items-center justify-center font-black text-3xl shadow-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight mt-4 text-center leading-tight">
                  {user.name}
                </h2>
                <Badge className={cn(
                  "mt-2 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5 border-0",
                  user.is_blocked 
                    ? "bg-red-50 text-red-600" 
                    : "bg-green-50 text-green-600"
                )}>
                  {user.is_blocked ? 'Blocked' : 'Active Member'}
                </Badge>
              </div>

              {/* Contact Information */}
              <div className="space-y-4 pt-6">
                <div className="flex items-center gap-3 text-slate-600 p-0.5">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Email</p>
                    <p className="font-semibold text-slate-700 truncate mt-1 text-sm">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-600 p-0.5">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Phone</p>
                    <p className="font-semibold text-slate-700 mt-1 text-sm">{user.phone || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-600 p-0.5">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Member Since</p>
                    <p className="font-semibold text-slate-700 mt-1 text-sm">
                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Block/Unblock Button */}
              <div className="pt-6 mt-6 border-t border-slate-100/80">
                <Button
                  variant={user.is_blocked ? "destructive" : "outline"}
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/admin/users/${user.id}/toggle-block`, {
                        method: 'POST'
                      });
                      if (!response.ok) throw new Error('Failed to update user status');
                      const updatedUser = await response.json();
                      setUser(updatedUser);
                      toast.success(user.is_blocked ? 'User unblocked successfully' : 'User blocked successfully');
                    } catch (err) {
                      toast.error('Failed to update user status');
                    }
                  }}
                  className={cn(
                    "w-full h-10 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all duration-150 flex items-center justify-center gap-2",
                    user.is_blocked 
                      ? "bg-red-50 text-red-600 border-red-100/50 hover:bg-red-100 hover:text-red-700" 
                      : "bg-slate-50 text-slate-700 border-slate-200/60 hover:bg-slate-100 hover:text-slate-800"
                  )}
                >
                  {user.is_blocked ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                  <span>{user.is_blocked ? 'Unblock User' : 'Block User'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Documents Card */}
          <Card className="bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.015)]">
            <CardContent className="p-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" /> Documents
              </h3>
              
              {user.documents && user.documents.length > 0 ? (
                <div className="space-y-3">
                  {user.documents.map((doc) => (
                    <div key={doc.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-700 text-xs capitalize leading-none">{doc.type.replace('_', ' ')}</h4>
                          <p className="text-[9px] font-semibold text-slate-400 mt-1">
                            {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <Badge className={cn(
                          "font-bold uppercase text-[8px] tracking-wider px-1.5 py-0.5 rounded border-0",
                          doc.status === 'approved' ? "bg-green-50 text-green-700" :
                          doc.status === 'rejected' ? "bg-red-50 text-red-700" :
                          "bg-yellow-50 text-yellow-700"
                        )}>
                          {doc.status}
                        </Badge>
                      </div>
                      {doc.rejection_reason && (
                        <p className="text-[10px] text-red-600 mt-2 font-medium bg-red-50/50 p-1.5 rounded">
                          Reason: {doc.rejection_reason}
                        </p>
                      )}
                      <div className="mt-3 flex justify-between items-center border-t border-slate-100/60 pt-2.5">
                        <a 
                          href={doc.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-[#f26e24] hover:text-[#e05d13] flex items-center gap-1"
                        >
                          View Document <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateDocumentStatus(doc.id, 'approved')}
                            className={cn(
                              "text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all duration-150",
                              doc.status === 'approved' 
                                ? "bg-green-50 text-green-600 border-green-200/50 cursor-default"
                                : "bg-white text-slate-500 border-slate-200 hover:bg-green-50/50 hover:text-green-600 hover:border-green-200/50"
                            )}
                            disabled={doc.status === 'approved'}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                          
                          <button
                            onClick={() => handleUpdateDocumentStatus(doc.id, 'rejected')}
                            className={cn(
                              "text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all duration-150",
                              doc.status === 'rejected'
                                ? "bg-red-50 text-red-600 border-red-200/50 cursor-default"
                                : "bg-white text-slate-500 border-slate-200 hover:bg-red-50/50 hover:text-red-600 hover:border-red-200/50"
                            )}
                            disabled={doc.status === 'rejected'}
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl">
                  Document verification not required
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Statistics & Booking History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trip Statistics Card */}
          {user.trip_data && (
            <Card className="bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.015)]">
              <CardContent className="p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-slate-400" /> Trip Statistics
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl border-l-4 border-l-blue-500 shadow-xs">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Trips</p>
                    <p className="text-xl font-black text-slate-800 mt-1 tabular-nums">{user.trip_data.total_trips}</p>
                  </div>
                  
                  <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl border-l-4 border-l-green-500 shadow-xs">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Completed</p>
                    <p className="text-xl font-black text-green-600 mt-1 tabular-nums">{user.trip_data.completed_trips}</p>
                  </div>

                  <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl border-l-4 border-l-red-500 shadow-xs">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cancelled</p>
                    <p className="text-xl font-black text-red-600 mt-1 tabular-nums">{user.trip_data.cancelled_trips}</p>
                  </div>

                  <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl border-l-4 border-l-[#f26e24] shadow-xs">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Spent</p>
                    <p className="text-xl font-black text-slate-800 mt-1 tabular-nums">₹{user.trip_data.total_spent.toLocaleString()}</p>
                  </div>
                </div>

                {user.trip_data.favorite_vehicle_type && (
                  <div className="mt-4 p-3 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Favorite Vehicle Type</span>
                    <Badge variant="outline" className="bg-white border-slate-200 text-slate-700 capitalize font-bold text-[10px] py-0.5 px-2.5">
                      {user.trip_data.favorite_vehicle_type}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Booking History Card */}
          <Card className="bg-white border border-slate-200/70 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.015)]">
            <CardContent className="p-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" /> Booking History
              </h3>
              
              {user.bookings && user.bookings.length > 0 ? (
                <div className="space-y-3">
                  {user.bookings.map((booking) => (
                    <div 
                      key={booking.id} 
                      className="group bg-slate-50/30 hover:bg-white border border-slate-200/50 hover:border-[#f26e24]/20 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4 cursor-pointer"
                      onClick={() => router.push(`/admin/bookings/${booking.booking_id}`)}
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10 tracking-widest uppercase">
                            {booking.booking_id}
                          </span>
                          <h4 className="font-extrabold text-slate-800 text-sm">{booking.vehicle?.name || 'Unknown Vehicle'}</h4>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">• {booking.vehicle?.type || 'N/A'}</span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                          <div>
                            <span className="text-[9px] font-bold text-slate-300 uppercase block tracking-wider">Pickup</span>
                            <span className="text-slate-600">{new Date(booking.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </div>
                          <div className="text-slate-300 font-bold uppercase text-[9px] mt-2">to</div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-300 uppercase block tracking-wider">Dropoff</span>
                            <span className="text-slate-600">{new Date(booking.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col justify-between sm:items-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                        <div className="text-right">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block tracking-widest">Amount</span>
                          <span className="text-sm font-black text-slate-800 tabular-nums">₹{booking.total_price.toLocaleString()}</span>
                        </div>
                        
                        <div className="flex gap-1.5">
                          <Badge className={cn(
                            "font-bold uppercase text-[8px] tracking-wider px-1.5 py-0.5 border-0 shadow-xs",
                            booking.status === 'completed' ? "bg-green-50 text-green-700" :
                            booking.status === 'cancelled' ? "bg-red-50 text-red-700" :
                            "bg-yellow-50 text-yellow-700"
                          )}>
                            {booking.status}
                          </Badge>
                          
                          <Badge variant="outline" className={cn(
                            "font-bold uppercase text-[8px] tracking-wider px-1.5 py-0.5 border-0 shadow-xs",
                            booking.payment_status === 'completed' ? "bg-green-50 text-green-700" :
                            booking.payment_status === 'failed' ? "bg-red-50 text-red-700" :
                            "bg-yellow-50 text-yellow-700"
                          )}>
                            {booking.payment_status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-2xl bg-slate-50/10">
                  No booking history available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}