'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import logger from '@/lib/logger';
import { SignatureCanvas } from '@/components/ui';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

// Reuse the same interfaces from CreateOfflineBookingModal
interface FormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  vehicleId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  rentalAmount: number;
  securityDeposit: number;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  paymentReference: string;
  notes: string;
  bookingLocation: string;
  termsAgreed: boolean[];
}

interface Vehicle {
  id: string;
  name: string;
  price_per_hour: number;
  special_pricing_7_days?: number;
  special_pricing_15_days?: number;
  special_pricing_30_days?: number;
  status: string;
  is_available: boolean;
}

const OfflineBookingPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [signatureData, setSignatureData] = useState<string>('');
  const [datesSelected, setDatesSelected] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    vehicleId: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    startTime: format(new Date(), 'HH:mm'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    endTime: format(new Date(), 'HH:mm'),
    rentalAmount: 0,
    securityDeposit: 0,
    totalAmount: 0,
    paidAmount: 0,
    paymentMethod: 'cash',
    paymentStatus: 'pending',
    paymentReference: '',
    notes: '',
    bookingLocation: '',
    termsAgreed: [false, false, false],
  });

  const handleInputChange = (field: keyof FormData, value: string | number | boolean[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSignatureChange = (dataUrl: string | null) => {
    setSignatureData(dataUrl || '');
  };

  const handleAmountChange = (field: 'rentalAmount' | 'securityDeposit' | 'paidAmount', value: number) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
      
      // Calculate total amount
      if (field === 'rentalAmount' || field === 'securityDeposit') {
        newData.totalAmount = newData.rentalAmount + newData.securityDeposit;
      }
      
      // Update payment status based on paid amount
      if (field === 'paidAmount') {
        if (value === 0) {
          newData.paymentStatus = 'pending';
        } else if (value >= newData.totalAmount) {
          newData.paymentStatus = 'completed';
        } else if (value < newData.totalAmount) {
          newData.paymentStatus = 'partial';
        }
      }
      
      return newData;
    });
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/admin/vehicles', {
        credentials: 'include', // Include credentials in the request
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch vehicles:', errorText);
        throw new Error('Failed to fetch vehicles');
      }
      const data = await response.json();
      
      // Debug logging
      console.log('Vehicles API response:', data);
      
      if (!data.vehicles || !Array.isArray(data.vehicles)) {
        console.error('Invalid vehicles data format:', data);
        throw new Error('Invalid vehicles data format');
      }
      
      // Filter only active and available vehicles
      const activeVehicles = data.vehicles.filter(
        (vehicle: Vehicle) => vehicle.status === 'active' && vehicle.is_available
      );
      
      console.log('Active vehicles:', activeVehicles);
      setVehicles(activeVehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles');
      logger.error('Failed to fetch vehicles:', error);
    }
  };

  // Load vehicles on component mount
  useEffect(() => {
    fetchVehicles();
  }, []);

  // Also load vehicles when dates change
  const handleDateTimeChange = async (field: 'startDate' | 'startTime' | 'endDate' | 'endTime', value: string) => {
    handleInputChange(field, value);
    
    // Check if all date and time fields are filled
    const newFormData = { ...formData, [field]: value };
    const allDatesFilled = newFormData.startDate && newFormData.startTime && 
                         newFormData.endDate && newFormData.endTime;
    
    if (allDatesFilled) {
      setDatesSelected(true);
      await fetchVehicles();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.customerName || !formData.customerPhone || !formData.vehicleId) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.termsAgreed.every(Boolean)) {
      toast.error('Please agree to all terms and conditions');
      return;
    }

    if (!signatureData) {
      toast.error('Please provide a signature');
      return;
    }

    if (formData.paidAmount > formData.totalAmount) {
      toast.error('Paid amount cannot be greater than total amount');
      return;
    }
    
    try {
      setLoading(true);

      // Combine date and time fields
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
      
      const bookingData = {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail || null,
        vehicleId: formData.vehicleId,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        totalAmount: formData.totalAmount,
        rentalAmount: formData.rentalAmount,
        securityDeposit: formData.securityDeposit,
        paidAmount: formData.paidAmount,
        paymentMethod: formData.paymentMethod,
        paymentStatus: formData.paymentStatus,
        paymentReference: formData.paymentReference,
        notes: formData.notes,
        signature: signatureData,
        bookingLocation: formData.bookingLocation
      };
      
      const response = await fetch('/api/admin/bookings/offline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create booking');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('Offline booking created successfully');
        router.push('/admin/bookings');
      } else {
        throw new Error(result.error || 'Failed to create booking');
      }
      
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Create Offline Booking</h1>
        <Button variant="outline" onClick={() => router.push('/admin/bookings')}>
          Back to Bookings
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Details Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  required
                  placeholder="Enter customer name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone Number *</Label>
                <Input
                  id="customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                  required
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bookingLocation">Booking Location</Label>
                <Input
                  id="bookingLocation"
                  value={formData.bookingLocation}
                  onChange={(e) => handleInputChange('bookingLocation', e.target.value)}
                  placeholder="Enter booking location"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Details Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Booking Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date & Time *</Label>
                  <div className="flex gap-2">
                    <div className="relative w-[60%]">
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => handleDateTimeChange('startDate', e.target.value)}
                        required
                        className="w-full"
                      />
                      <CalendarIcon className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="w-[40%]">
                      <Input
                        id="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => handleDateTimeChange('startTime', e.target.value)}
                        required
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>End Date & Time *</Label>
                  <div className="flex gap-2">
                    <div className="relative w-[60%]">
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => handleDateTimeChange('endDate', e.target.value)}
                        required
                        className="w-full"
                      />
                      <CalendarIcon className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="w-[40%]">
                      <Input
                        id="endTime"
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => handleDateTimeChange('endTime', e.target.value)}
                        required
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle">Select Vehicle *</Label>
                <Select 
                  value={formData.vehicleId} 
                  onValueChange={(value: string) => handleInputChange('vehicleId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.length > 0 ? (
                      vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none text-muted-foreground">
                        No vehicles available
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {/* Debug info */}
                <div className="text-xs text-gray-500 mt-1">
                  {`Available vehicles: ${vehicles.length}`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Details Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rentalAmount">Rental Amount *</Label>
                <Input
                  id="rentalAmount"
                  type="number"
                  value={formData.rentalAmount}
                  onChange={(e) => handleAmountChange('rentalAmount', Number(e.target.value))}
                  required
                  placeholder="Enter rental amount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="securityDeposit">Security Deposit *</Label>
                <Input
                  id="securityDeposit"
                  type="number"
                  value={formData.securityDeposit}
                  onChange={(e) => handleAmountChange('securityDeposit', Number(e.target.value))}
                  required
                  placeholder="Enter security deposit"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  value={formData.totalAmount}
                  readOnly
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paidAmount">Paid Amount *</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  value={formData.paidAmount}
                  onChange={(e) => handleAmountChange('paidAmount', Number(e.target.value))}
                  required
                  placeholder="Enter paid amount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select 
                  value={formData.paymentMethod} 
                  onValueChange={(value: string) => handleInputChange('paymentMethod', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Input
                  id="paymentStatus"
                  value={formData.paymentStatus}
                  readOnly
                  className="bg-gray-50 capitalize"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="paymentReference">Payment Reference</Label>
                <Input
                  id="paymentReference"
                  value={formData.paymentReference}
                  onChange={(e) => handleInputChange('paymentReference', e.target.value)}
                  placeholder="Enter payment reference"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Details Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="min-h-[100px]"
                  placeholder="Enter any additional notes"
                />
              </div>

              <div className="space-y-3">
                <Label>Terms & Conditions</Label>
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                  {['I agree to the rental terms and conditions', 
                    'I confirm the vehicle has been inspected', 
                    'I understand the security deposit terms'].map((term, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.termsAgreed[index]}
                        onChange={(e) => {
                          const newTermsAgreed = [...formData.termsAgreed];
                          newTermsAgreed[index] = e.target.checked;
                          handleInputChange('termsAgreed', newTermsAgreed);
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{term}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Customer Signature *</Label>
                <SignatureCanvas
                  onChange={handleSignatureChange}
                  className="border rounded-lg bg-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/bookings')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Booking...
              </>
            ) : (
              'Create Booking'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OfflineBookingPage; 