'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const formSchema = z.object({
  booking_id: z.string().min(1, 'Booking ID is required'),
  condition_notes: z.string(),
  damages: z.array(z.string()),
  additional_charges: z.number().min(0),
  odometer_reading: z.number().min(0),
  fuel_level: z.number().min(0).max(100),
  status: z.enum(['pending', 'completed', 'disputed']),
});

type FormData = z.infer<typeof formSchema>;

export default function NewVehicleReturnPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
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
      status: 'pending',
    },
  });

  useEffect(() => {
    const bookingId = searchParams.get('bookingId');
    if (bookingId) {
      form.setValue('booking_id', bookingId);
      fetchBookingDetails(bookingId);
    } else {
      router.push('/admin/vehicle-returns');
    }
  }, [searchParams]);

  const fetchBookingDetails = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/admin/bookings?id=${bookingId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch booking details');
      }

      setBookingDetails(data.data);
      form.setValue('booking_id', bookingId);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch booking details'
      });
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
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to process vehicle return');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to process vehicle return');
      }

      toast({
        title: 'Success',
        description: 'Vehicle return processed successfully',
      });

      router.push('/admin/vehicle-returns');
    } catch (error) {
      console.error('Error processing vehicle return:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process vehicle return',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Process Vehicle Return</CardTitle>
          <CardDescription>
            Enter the details for the returned vehicle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="booking_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking ID</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {bookingDetails && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg mb-6">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vehicle</p>
                    <p className="text-sm">{bookingDetails.vehicle_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Customer</p>
                    <p className="text-sm">{bookingDetails.user_name}</p>
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
                        {...field}
                        placeholder="Enter notes about vehicle condition"
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
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter any additional charges for damages or late returns
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
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
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          min={0}
                          max={100}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="disputed">Disputed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Processing...' : 'Process Return'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 