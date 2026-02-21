'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    BellRing,
    Search,
    MapPin,
    Calendar,
    User,
    Phone,
    Mail,
    Car,
    ChevronRight,
    Send,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils/currency';

interface PendingBooking {
    id: string;
    booking_id: string;
    total_price: number;
    paid_amount: number;
    pending_amount: number;
    status: string;
    start_date: string;
    created_at: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    vehicle_name: string;
}

const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case 'active': return 'bg-green-100 text-green-700 border-green-200';
        case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
};

export default function PaymentRemindersPage() {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const [bookings, setBookings] = useState<PendingBooking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sendingId, setSendingId] = useState<string | null>(null);

    useEffect(() => {
        if (authStatus === 'unauthenticated') {
            router.push('/admin-login');
        } else if (session?.user && session.user.role !== 'admin' && session.user.role !== 'staff') {
            router.push('/');
        }
    }, [session, authStatus, router]);

    useEffect(() => {
        fetchPendingBookings();
    }, []);

    const fetchPendingBookings = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/admin/payment-reminders');
            const data = await response.json();
            if (data.success) {
                setBookings(data.data);
            } else {
                toast.error(data.error || 'Failed to fetch pending bookings');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Failed to load pending bookings');
        } finally {
            setIsLoading(false);
        }
    };

    const sendReminder = async (bookingId: string, reminderType: 'first' | 'second' | 'final') => {
        try {
            setSendingId(`${bookingId}-${reminderType}`);
            const response = await fetch('/api/admin/payment-reminders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    booking_id: bookingId,
                    reminder_type: reminderType
                })
            });

            const data = await response.json();
            if (data.success) {
                toast.success(`${reminderType.charAt(0).toUpperCase() + reminderType.slice(1)} reminder sent successfully!`);
            } else {
                toast.error(data.error || 'Failed to send reminder');
            }
        } catch (error) {
            console.error('Send error:', error);
            toast.error('Failed to send payment reminder');
        } finally {
            setSendingId(null);
        }
    };

    const filteredBookings = bookings.filter(booking =>
        booking.booking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.customer_phone.includes(searchTerm)
    );

    if (authStatus === 'loading' || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Payment Reminders</h1>
                    <p className="text-muted-foreground">Manage and send payment reminders for pending bookings.</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search bookings..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-4">
                {filteredBookings.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center py-12 text-center border-dashed">
                        <BellRing className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                        <p className="text-lg font-medium">No pending bookings found</p>
                        <p className="text-sm text-muted-foreground">Try adjusting your search or check again later.</p>
                    </Card>
                ) : (
                    filteredBookings.map((booking) => (
                        <Card key={booking.id} className="overflow-hidden border-l-4 border-l-yellow-500 shadow-sm hover:shadow-md transition-all duration-250">
                            <CardContent className="p-0">
                                <div className="p-4 md:p-6 flex flex-col md:flex-row gap-4 md:items-center justify-between">
                                    <div className="grid gap-1 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-primary bg-primary/5 px-2 py-0.5 rounded uppercase tracking-wider">
                                                {booking.booking_id}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-tight ${getStatusColor(booking.status)}`}>
                                                {booking.status}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                Created {format(new Date(booking.created_at), 'MMM d, yyyy')}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm font-medium">{booking.customer_name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">{booking.customer_phone}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Car className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">{booking.vehicle_name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm text-muted-foreground">Starts {format(new Date(booking.start_date), 'MMM d, HH:mm')}</span>
                                            </div>
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-baseline gap-x-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</span>
                                                <span className="text-sm font-semibold text-gray-600">
                                                    {formatCurrency(booking.total_price)}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Paid</span>
                                                <span className="text-sm font-semibold text-green-600">
                                                    {formatCurrency(booking.paid_amount || 0)}
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Balance Due</span>
                                                <span className="text-lg font-bold text-gray-900 tabular-nums">
                                                    {formatCurrency(booking.pending_amount || 0)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 md:self-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => sendReminder(booking.id, 'first')}
                                            disabled={sendingId === `${booking.id}-first`}
                                            className="gap-2"
                                        >
                                            {sendingId === `${booking.id}-first` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                            1st Reminder
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => sendReminder(booking.id, 'second')}
                                            disabled={sendingId === `${booking.id}-second`}
                                            className="gap-2"
                                        >
                                            {sendingId === `${booking.id}-second` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                            2nd Reminder
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => sendReminder(booking.id, 'final')}
                                            disabled={sendingId === `${booking.id}-final`}
                                            className="gap-2 shadow-sm"
                                        >
                                            {sendingId === `${booking.id}-final` ? <Loader2 className="h-3 w-3 animate-spin" /> : <BellRing className="h-3 w-3" />}
                                            Final Notice
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
