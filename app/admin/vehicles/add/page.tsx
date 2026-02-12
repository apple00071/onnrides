'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import logger from '@/lib/logger';
import Image from 'next/image';

const vehicleTypes = [
  'Bike',
  'Scooter',
] as const;

const locations = [
  'Eragadda',
  'Madhapur',
] as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(vehicleTypes, {
    required_error: 'Please select a vehicle type',
  }),
  location: z.array(z.enum(locations)).min(1, 'Please select at least one location'),
  quantity: z.coerce
    .number()
    .min(1, 'Quantity must be at least 1')
    .max(100, 'Quantity cannot exceed 100'),
  price_per_day: z.coerce
    .number()
    .min(399, 'Price must be at least ₹399')
    .max(50000, 'Price cannot exceed ₹50,000'),
  image: z
    .any()
    .refine((file) => file instanceof File, "Please upload an image")
    .refine(
      (file) => file instanceof File && file.size <= MAX_FILE_SIZE,
      `Max file size is 5MB`
    )
    .refine(
      (file) => file instanceof File && ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Only .jpg, .jpeg, .png and .webp formats are supported"
    ),
});

type FormValues = z.infer<typeof formSchema>;

interface FieldProps {
  field: {
    value: any;
    onChange: (value: any) => void;
    onBlur: () => void;
    name: string;
    ref: React.Ref<any>;
  };
}

export default function AddVehiclePage() {
  const router = useRouter();
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      quantity: 1,
      price_per_day: 1000,
      location: [],
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Set the file in form
      form.setValue('image', file, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('type', data.type);
      formData.append('location', JSON.stringify(data.location));
      formData.append('quantity', String(data.quantity));
      formData.append('price_per_day', String(data.price_per_day));
      formData.append('image', data.image);

      const response = await fetch('/api/admin/vehicles', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add vehicle');
      }

      toast.success('Vehicle added successfully');
      router.push('/admin/vehicles');
      router.refresh();
    } catch (error) {
      logger.error('Error:', error);
      toast.error('Failed to add vehicle');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Add New Vehicle</CardTitle>
          <CardDescription>
            Add a new vehicle to your rental fleet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }: FieldProps) => (
                  <FormItem>
                    <FormLabel>Vehicle Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Toyota Camry" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the full name of the vehicle
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }: FieldProps) => (
                  <FormItem>
                    <FormLabel>Vehicle Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicleTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the type of vehicle
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }: FieldProps) => (
                  <FormItem>
                    <FormLabel>Locations</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {locations.map((loc) => (
                        <Button
                          key={loc}
                          type="button"
                          variant={
                            field.value?.includes(loc)
                              ? 'default'
                              : 'outline'
                          }
                          onClick={() => {
                            const newValue = field.value?.includes(loc)
                              ? field.value.filter((l: string) => l !== loc)
                              : [...(field.value || []), loc];
                            field.onChange(newValue);
                          }}
                        >
                          {loc}
                        </Button>
                      ))}
                    </div>
                    <FormDescription>
                      Select the locations where this vehicle is available
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }: FieldProps) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of vehicles available
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price_per_day"
                  render={({ field }: FieldProps) => (
                    <FormItem>
                      <FormLabel>Price per Day (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={399}
                          max={50000}
                          step={1}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Daily rental price in rupees
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="image"
                render={({ field: { value, onChange, ...field } }: { field: { value: any; onChange: any; [key: string]: any } }) => (
                  <FormItem>
                    <FormLabel>Vehicle Image</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept={ACCEPTED_IMAGE_TYPES.join(',')}
                        onChange={handleImageChange}
                        {...field}
                      />
                    </FormControl>
                    {imagePreview && (
                      <div className="relative h-48 w-full mt-2">
                        <Image
                          src={imagePreview}
                          alt="Vehicle preview"
                          fill
                          className="object-cover rounded-md"
                        />
                      </div>
                    )}
                    <FormDescription>
                      Upload a clear image of the vehicle (max 5MB, JPG/PNG/WebP)
                    </FormDescription>
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
                <Button type="submit">Add Vehicle</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 