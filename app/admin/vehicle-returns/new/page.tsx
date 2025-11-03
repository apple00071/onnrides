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
          booking_id: bookingDetails.id
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
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Complete Booking</CardTitle>
          <CardDescription>
            Enter the final details to complete the booking
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-accent/10 rounded-lg mb-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Vehicle Details</h3>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Name</p>
                            <p className="text-base">{bookingDetails.vehicle?.name || 'Not assigned'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Type</p>
                            <p className="text-base">{bookingDetails.vehicle?.type || 'Not specified'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Customer Details</h3>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Name</p>
                            <p className="text-base">{bookingDetails.user?.name || 'Not assigned'}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Contact</p>
                            <p className="text-base">{bookingDetails.user?.phone || 'No phone'}</p>
                            <p className="text-sm text-muted-foreground">{bookingDetails.user?.email || 'No email'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Complete Booking'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 