import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'react-hot-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfToday } from 'date-fns';
import { cn } from '@/lib/utils';

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
        vehicle_id: string;
    };
    onUpdate: () => void;
}

export function EditBookingModal({ isOpen, onClose, booking, onUpdate }: EditBookingModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        pickup_location: '',
        total_price: '',
        status: '',
        modification_reason: ''
    });

    // Initialize form data when modal opens
    useEffect(() => {
        if (isOpen && booking) {
            const startD = booking.start_date ? new Date(booking.start_date) : new Date();
            const endD = booking.end_date ? new Date(booking.end_date) : new Date();

            setFormData({
                startDate: format(startD, 'yyyy-MM-dd'),
                startTime: format(startD, 'HH:mm'),
                endDate: format(endD, 'yyyy-MM-dd'),
                endTime: format(endD, 'HH:mm'),
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

    const handleStartDateChange = (dateStr: string) => {
        setFormData(prev => ({ ...prev, startDate: dateStr }));
    };

    const handleStartTimeChange = (timeStr: string) => {
        setFormData(prev => ({ ...prev, startTime: timeStr }));
    };

    const handleEndDateChange = (dateStr: string) => {
        setFormData(prev => ({ ...prev, endDate: dateStr }));
    };

    const handleEndTimeChange = (timeStr: string) => {
        setFormData(prev => ({ ...prev, endTime: timeStr }));
    };

    const getTimeOptions = (isPickup: boolean) => {
        const options = [];
        for (let i = 0; i < 48; i++) {
            const h = Math.floor(i / 2);
            const m = (i % 2) * 30;

            if (!isPickup && formData.startDate && formData.endDate && formData.startTime) {
                const startD = new Date(formData.startDate);
                const endD = new Date(formData.endDate);
                startD.setHours(0, 0, 0, 0);
                endD.setHours(0, 0, 0, 0);
                if (startD.getTime() === endD.getTime()) {
                    const [pickupHour, pickupMin] = formData.startTime.split(':').map(Number);
                    if (h * 60 + m <= pickupHour * 60 + pickupMin) continue;
                }
            }

            const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            const period = h >= 12 ? 'PM' : 'AM';
            const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            const label = `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
            options.push({ value, label });
        }
        return options;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.modification_reason) {
            toast.error('Please provide a reason for modification');
            return;
        }

        if (!formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) {
            toast.error('Please select both pick-up and drop-off date & time');
            return;
        }

        // Combine date and time
        const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
        const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

        if (endDateTime <= startDateTime) {
            toast.error('Drop-off date & time cannot be before or equal to Pickup date & time');
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
                    start_date: startDateTime.toISOString(),
                    end_date: endDateTime.toISOString(),
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
            <DialogContent className="sm:max-w-[550px] bg-white text-gray-900">
                <DialogHeader>
                    <DialogTitle>Edit Booking {booking.booking_id}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Pickup Date & Time</Label>
                            <div className="flex gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={cn(
                                                "flex-1 justify-start text-left font-normal h-10 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-100/50 text-gray-800 hover:text-gray-900 transition-colors",
                                                !formData.startDate && "text-gray-400"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                                            <span className="truncate whitespace-nowrap">
                                                {formData.startDate ? format(new Date(formData.startDate), "dd MMM yyyy") : "Date"}
                                            </span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-white text-gray-900" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={formData.startDate ? new Date(formData.startDate) : undefined}
                                            onSelect={(date) => {
                                                if (date) {
                                                    handleStartDateChange(format(date, 'yyyy-MM-dd'));
                                                } else {
                                                    handleStartDateChange('');
                                                }
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>

                                <Select 
                                    value={formData.startTime} 
                                    onValueChange={handleStartTimeChange}
                                >
                                    <SelectTrigger className="w-24 h-10 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-800 hover:bg-gray-100/50">
                                        <SelectValue placeholder="Time" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white text-gray-900">
                                        {getTimeOptions(true).map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Drop-off Date & Time</Label>
                            <div className="flex gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={cn(
                                                "flex-1 justify-start text-left font-normal h-10 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-100/50 text-gray-800 hover:text-gray-900 transition-colors",
                                                !formData.endDate && "text-gray-400"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                                            <span className="truncate whitespace-nowrap">
                                                {formData.endDate ? format(new Date(formData.endDate), "dd MMM yyyy") : "Date"}
                                            </span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-white text-gray-900" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={formData.endDate ? new Date(formData.endDate) : undefined}
                                            onSelect={(date) => {
                                                if (date) {
                                                    handleEndDateChange(format(date, 'yyyy-MM-dd'));
                                                } else {
                                                    handleEndDateChange('');
                                                }
                                            }}
                                            disabled={(date) => {
                                                const minDateLimit = formData.startDate ? new Date(formData.startDate) : startOfToday();
                                                return date < minDateLimit;
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>

                                <Select 
                                    value={formData.endTime} 
                                    onValueChange={handleEndTimeChange}
                                >
                                    <SelectTrigger className="w-24 h-10 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-800 hover:bg-gray-100/50">
                                        <SelectValue placeholder="Time" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white text-gray-900">
                                        {getTimeOptions(false).map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
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
                                <SelectContent className="bg-white text-gray-900">
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
                        <Button type="submit" className="bg-[#f26e24] hover:bg-[#e05d13] text-white" disabled={isLoading}>
                            {isLoading ? 'Updating...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
