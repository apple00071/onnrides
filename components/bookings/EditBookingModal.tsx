import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface EditBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: {
        id: string;
        booking_id: string;
        start_date: string | Date;
        end_date: string | Date;
        pickup_location?: string | null;
        total_amount?: number;
        status: string;
        vehicle_id: string; // Needed for potential vehicle change logic, though we might keep it simple first
    };
    onUpdate: () => void;
}

export function EditBookingModal({ isOpen, onClose, booking, onUpdate }: EditBookingModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        start_date: '',
        end_date: '',
        pickup_location: '',
        total_price: '',
        status: '',
        modification_reason: ''
    });

    // Initialize form data when modal opens
    useEffect(() => {
        if (isOpen && booking) {
            // Format dates for datetime-local input (YYYY-MM-DDThh:mm)
            // We must handle timezone offset to display local time correctly
            const formatDate = (date: string | Date) => {
                if (!date) return '';
                const d = new Date(date);
                const offset = d.getTimezoneOffset() * 60000; // offset in milliseconds
                const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
                return localISOTime;
            };

            setFormData({
                start_date: formatDate(booking.start_date),
                end_date: formatDate(booking.end_date),
                pickup_location: booking.pickup_location?.replace(/^"|"$/g, '') || '', // Remove quotes if present
                total_price: booking.total_amount?.toString() || '',
                status: booking.status,
                modification_reason: ''
            });
        }
    }, [isOpen, booking]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleStatusChange = (value: string) => {
        setFormData(prev => ({ ...prev, status: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.modification_reason) {
            toast.error('Please provide a reason for modification');
            return;
        }

        // Validate date range
        const startDate = new Date(formData.start_date);
        const endDate = new Date(formData.end_date);

        if (endDate < startDate) {
            toast.error('Drop-off date cannot be before Pickup date');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`/api/admin/bookings/${booking.booking_id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    start_date: new Date(formData.start_date).toISOString(),
                    end_date: new Date(formData.end_date).toISOString(),
                    pickup_location: formData.pickup_location,
                    total_price: parseFloat(formData.total_price),
                    status: formData.status,
                    modification_reason: formData.modification_reason
                }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Booking updated successfully');
                onUpdate();
                onClose();
            } else {
                toast.error(result.error || 'Failed to update booking');
            }
        } catch (error) {
            console.error('Error updating booking:', error);
            toast.error('Failed to update booking');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Booking {booking.booking_id}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="start_date">Pickup Date & Time</Label>
                            <Input
                                id="start_date"
                                name="start_date"
                                type="datetime-local"
                                value={formData.start_date}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end_date">Drop-off Date & Time</Label>
                            <Input
                                id="end_date"
                                name="end_date"
                                type="datetime-local"
                                value={formData.end_date}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="pickup_location">Pickup Location</Label>
                        <Input
                            id="pickup_location"
                            name="pickup_location"
                            value={formData.pickup_location}
                            onChange={handleChange}
                            placeholder="Enter pickup location"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="total_price">Total Price (₹)</Label>
                            <Input
                                id="total_price"
                                name="total_price"
                                type="number"
                                value={formData.total_price}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select value={formData.status} onValueChange={handleStatusChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="modification_reason">Reason for Modification <span className="text-red-500">*</span></Label>
                        <Textarea
                            id="modification_reason"
                            name="modification_reason"
                            value={formData.modification_reason}
                            onChange={handleChange}
                            placeholder="Why are you changing this booking?"
                            required
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" className="bg-[#f26e24] hover:bg-[#e05d13]" disabled={isLoading}>
                            {isLoading ? 'Updating...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
