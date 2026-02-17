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
  security_deposit_deductions: z.number().min(0).optional(),
  security_deposit_refund_amount: z.number().min(0).optional(),
  security_deposit_refund_method: z.string().optional(),
  deduction_reasons: z.string().optional(),
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
      security_deposit_deductions: 0,
      security_deposit_refund_amount: 0,
      security_deposit_refund_method: 'cash',
      deduction_reasons: '',
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
      form.setValue('booking_id', data.data.booking_id);

      // Initialize security deposit refund amount if there's a security deposit
      if (data.data.security_deposit_amount && data.data.security_deposit_amount > 0) {
        form.setValue('security_deposit_refund_amount', data.data.security_deposit_amount);
      }

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
          // Settlement collection is now handled atomically by netAmount logic in backend
          remaining_payment_collected: true,
          remaining_payment_method: data.payment_method,
          security_deposit_deductions: data.security_deposit_deductions || 0,
          security_deposit_refund_amount: data.security_deposit_refund_amount || 0,
          security_deposit_refund_method: data.payment_method, // Use same method for net settlement
          deduction_reasons: data.deduction_reasons
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
          <h1 className="text-3xl font-bold text-gray-900">Vehicle Return</h1>
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
                        <p className="text-base font-medium">{bookingDetails.vehicle?.name || 'Activa 6G'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Type</p>
                        <p className="text-base">{bookingDetails.vehicle?.type || 'bike'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Registration Number</p>
                        <p className="text-base font-medium">{bookingDetails.vehicle?.registration_number || 'Not assigned'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Details */}
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Customer Details</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Name</p>
                        <p className="text-base font-medium">
                          {bookingDetails.trip_initiation?.customer_name || bookingDetails.customer?.name || 'Unknown'}
                        </p>
                        {bookingDetails.customer?.name === 'Admin' && !bookingDetails.trip_initiation?.customer_name && (
                          <p className="text-[10px] text-orange-500 font-bold uppercase mt-1">Test Account</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Phone</p>
                        <p className="text-base">{bookingDetails.trip_initiation?.customer_phone || bookingDetails.customer?.phone || 'No phone'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Email</p>
                        <p className="text-base text-gray-500">{bookingDetails.trip_initiation?.customer_email || bookingDetails.customer?.email || 'No email'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Payment Details</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Amount</p>
                        <p className="text-lg font-bold text-green-600">₹{bookingDetails.amount?.toLocaleString() || '0'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Payment Status</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${bookingDetails.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                          bookingDetails.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                          {(bookingDetails.payment_status || 'Pending').charAt(0).toUpperCase() + (bookingDetails.payment_status || 'pending').slice(1)}
                        </span>
                      </div>
                      {bookingDetails.payment_breakdown && bookingDetails.payment_breakdown.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3 space-y-2">
                          <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Payment Breakdown</p>
                          {bookingDetails.payment_breakdown.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <span className="text-blue-700 font-medium capitalize">{item.method}</span>
                              <span className="text-blue-900 font-bold">₹{item.amount.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-blue-100 flex justify-between items-center text-xs font-bold">
                            <span className="text-blue-800 uppercase">Total Collected</span>
                            <span className="text-blue-900">₹{(bookingDetails.paid_amount || 0).toLocaleString()}</span>
                          </div>
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

                {/* Unified Net Settlement Section */}
                {bookingDetails && (
                  <div className="border-t pt-6 mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Settlement Summary</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left Side: Calculations */}
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Pending Booking Balance:</span>
                            <span className="font-medium">₹{(bookingDetails.pending_amount || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Additional Charges:</span>
                            <span className="font-medium text-orange-600">₹{(form.watch('additional_charges') || 0).toLocaleString()}</span>
                          </div>
                          <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-gray-900">
                            <span>Gross Amount Due:</span>
                            <span>₹{((bookingDetails.pending_amount || 0) + (form.watch('additional_charges') || 0)).toLocaleString()}</span>
                          </div>

                          {(bookingDetails.security_deposit_amount || 0) > 0 && (
                            <div className="pt-4 space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Security Deposit:</span>
                                <span className="font-medium text-green-600">₹{bookingDetails.security_deposit_amount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Deposit Deductions:</span>
                                <span className="font-medium text-red-600">-₹{(form.watch('security_deposit_deductions') || 0).toLocaleString()}</span>
                              </div>
                              <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-gray-900">
                                <span>Available for Refund:</span>
                                <span>₹{Math.max(0, bookingDetails.security_deposit_amount - (form.watch('security_deposit_deductions') || 0)).toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Net Result Card */}
                        <div className={`rounded-lg p-6 border-2 ${((bookingDetails.pending_amount || 0) + (form.watch('additional_charges') || 0) - Math.max(0, (bookingDetails.security_deposit_amount || 0) - (form.watch('security_deposit_deductions') || 0))) > 0
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-green-50 border-green-200'
                          }`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-semibold uppercase tracking-wider mb-1">
                                {((bookingDetails.pending_amount || 0) + (form.watch('additional_charges') || 0) - Math.max(0, (bookingDetails.security_deposit_amount || 0) - (form.watch('security_deposit_deductions') || 0))) > 0
                                  ? 'Collect from Customer'
                                  : 'Refund to Customer'
                                }
                              </p>
                              <h4 className="text-3xl font-black">
                                ₹{Math.abs(
                                  (bookingDetails.pending_amount || 0) +
                                  (form.watch('additional_charges') || 0) -
                                  Math.max(0, (bookingDetails.security_deposit_amount || 0) - (form.watch('security_deposit_deductions') || 0))
                                ).toLocaleString()}
                              </h4>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                              {((bookingDetails.pending_amount || 0) + (form.watch('additional_charges') || 0) - Math.max(0, (bookingDetails.security_deposit_amount || 0) - (form.watch('security_deposit_deductions') || 0))) > 0
                                ? <span className="text-2xl">📥</span>
                                : <span className="text-2xl">📤</span>
                              }
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Settlement Actions */}
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="payment_method"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Settlement Method</FormLabel>
                                <FormControl>
                                  <select
                                    {...field}
                                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-0 focus:border-orange-500"
                                  >
                                    <option value="cash">Cash</option>
                                    <option value="upi">UPI/QR Code</option>
                                    <option value="card">Card Payment</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="pt-4 border-t border-gray-100">
                            <div className="flex items-center space-x-2 bg-blue-50 p-4 rounded-lg border border-blue-100">
                              <input
                                type="checkbox"
                                id="confirm-settlement"
                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                required
                              />
                              <label htmlFor="confirm-settlement" className="text-sm font-medium text-blue-900 leading-tight">
                                I confirm that the net amount has been settled with the customer.
                              </label>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 px-1">
                              This will record the transaction, update booking status to 'completed', and release the vehicle back to inventory.
                            </p>
                          </div>
                        </div>
                      </div>
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
    </div >
  );
} 