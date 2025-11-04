'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { showToast } from "@/lib/utils/toast-helper";
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  booking_id: z.string().min(1, 'Booking ID is required'),
  condition_notes: z.string(),
  damages: z.array(z.string()),
  additional_charges: z.number().min(0),
  odometer_reading: z.number().min(0),
  fuel_level: z.number().min(0).max(100),
  collect_remaining_payment: z.boolean().optional(),
  payment_method: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function NewVehicleReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      condition_notes: '',
      damages: [],
      additional_charges: 0,
      odometer_reading: 0,
      fuel_level: 100,
      collect_remaining_payment: false,
      payment_method: 'cash',
    },
  });

  useEffect(() => {
    const bookingId = searchParams.get('bookingId');
    if (bookingId) {
      fetchBookingDetails(bookingId);
    } else {
      router.push('/admin/vehicle-returns');
    }
  }, [searchParams]);

  const fetchBookingDetails = async (bookingId: string) => {
    try {
      console.log('Fetching booking details for ID:', bookingId);
      const response = await fetch(`/api/admin/bookings/${bookingId}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Booking "${bookingId}" not found. Please check the booking ID and try again.`);
        }
        throw new Error(data.error || 'Failed to fetch booking details');
      }

      setBookingDetails(data.data);
      form.setValue('booking_id', bookingId);
      console.log('Successfully loaded booking details for:', bookingId);
      console.log('Booking details structure:', data.data);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch booking details';
      showToast.error(errorMessage);
      router.push('/admin/vehicle-returns');
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/vehicle-returns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          status: 'completed',
          booking_id: bookingDetails.id,
          remaining_payment_collected: data.collect_remaining_payment,
          remaining_payment_method: data.collect_remaining_payment ? data.payment_method : null
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process vehicle return');
      }

      showToast.success('Vehicle return processed successfully');
      router.push('/admin/vehicle-returns');
    } catch (error) {
      console.error('Error processing vehicle return:', error);
      showToast.error('Failed to process vehicle return');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Complete Booking</h1>
          <p className="text-gray-600 mt-2">
            Enter the final details to complete the booking
          </p>
        </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Booking ID</Label>
                  <p className="text-base font-medium mt-1">
                    {bookingDetails?.booking_id || 'Loading...'}
                  </p>
                </div>

                {bookingDetails && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
                    {/* Vehicle Details */}
                    <div className="bg-white rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-semibold mb-4 text-gray-900">Vehicle Details</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Name</p>
                          <p className="text-base font-medium">{bookingDetails.vehicle?.name || bookingDetails.vehicle_name || 'Activa 6G'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Type</p>
                          <p className="text-base">{bookingDetails.vehicle?.type || bookingDetails.vehicle_type || 'bike'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Registration Number</p>
                          <p className="text-base font-medium">{bookingDetails.vehicle?.registration_number || bookingDetails.registration_number || 'Not assigned'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Customer Details */}
                    <div className="bg-white rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-semibold mb-4 text-gray-900">Customer Details</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Name</p>
                          <p className="text-base font-medium">{bookingDetails.customer?.name || bookingDetails.user?.name || bookingDetails.customer_name || 'PAVAN KUMAR'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Phone</p>
                          <p className="text-base">{bookingDetails.customer?.phone || bookingDetails.user?.phone || bookingDetails.customer_phone || bookingDetails.phone_number || 'No phone'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Email</p>
                          <p className="text-base text-gray-500">{bookingDetails.customer?.email || bookingDetails.user?.email || bookingDetails.customer_email || bookingDetails.email || 'No email'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Payment Details */}
                    <div className="bg-white rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-semibold mb-4 text-gray-900">Payment Details</h3>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Amount</p>
                          <p className="text-lg font-bold text-green-600">₹{bookingDetails.amount?.toLocaleString() || bookingDetails.total_price?.toLocaleString() || '0'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Payment Status</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            bookingDetails.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                            bookingDetails.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {bookingDetails.booking_type === 'online' && bookingDetails.payment_status === 'completed' ?
                              '5% Collected' :
                              (bookingDetails.payment_status || 'Pending').charAt(0).toUpperCase() + (bookingDetails.payment_status || 'pending').slice(1)
                            }
                          </span>
                        </div>
                        {bookingDetails.booking_type === 'online' && bookingDetails.payment_status === 'completed' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                            <p className="text-xs font-medium text-blue-800">Online Booking - 5% Policy</p>
                            <p className="text-xs text-blue-700 mt-1">
                              Collected: ₹{Math.round((bookingDetails.amount || bookingDetails.total_price || 0) * 0.05).toLocaleString()}
                            </p>
                            <p className="text-xs text-blue-700">
                              Remaining: ₹{Math.round((bookingDetails.amount || bookingDetails.total_price || 0) * 0.95).toLocaleString()}
                            </p>
                            <p className="text-xs font-medium text-orange-600 mt-2">
                              ⚠️ Collect remaining amount at pickup
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Vehicle Return Details</h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="lg:col-span-2">
                      <FormField
                        control={form.control}
                        name="condition_notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Condition Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter notes about vehicle condition"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="additional_charges"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Charges (₹)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="odometer_reading"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Odometer Reading</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fuel_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fuel Level (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              min={0}
                              max={100}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Remaining Payment Collection Section */}
                  {bookingDetails && bookingDetails.booking_type === 'online' && bookingDetails.payment_status === 'completed' && (
                    <div className="border-t pt-6 mt-6">
                      <h4 className="text-md font-semibold text-gray-900 mb-4">Remaining Payment Collection</h4>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                        <p className="text-sm font-medium text-orange-800">Remaining Amount to Collect</p>
                        <p className="text-lg font-bold text-orange-600">
                          ₹{Math.round((bookingDetails.amount || bookingDetails.total_price || 0) * 0.95).toLocaleString()}
                        </p>
                        <p className="text-xs text-orange-700 mt-1">
                          This is the 95% remaining amount that needs to be collected at vehicle pickup.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="collect_remaining_payment"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-medium">
                                  Collect Remaining Payment
                                </FormLabel>
                                <p className="text-xs text-gray-500">
                                  Check this box to mark the remaining 95% as collected
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="payment_method"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payment Method</FormLabel>
                              <FormControl>
                                <select
                                  {...field}
                                  className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-0 focus:border-blue-500"
                                >
                                  <option value="cash">Cash</option>
                                  <option value="card">Card</option>
                                  <option value="upi">UPI</option>
                                  <option value="bank_transfer">Bank Transfer</option>
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-8 rounded-md transition-colors focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                      Processing...
                    </>
                  ) : (
                    'Complete Booking'
                  )}
                </button>
              </div>
            </form>
          </Form>
      </div>
    </div>
  );
} 