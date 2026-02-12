'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import logger from '@/lib/logger';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_booking_amount: number | null;
  max_discount_amount: number | null;
  start_date: string | null;
  end_date: string | null;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EditCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  coupon: Coupon;
}

export default function EditCouponModal({
  isOpen,
  onClose,
  onSuccess,
  coupon,
}: EditCouponModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: coupon.code,
    description: coupon.description || '',
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value.toString(),
    min_booking_amount: coupon.min_booking_amount?.toString() || '',
    max_discount_amount: coupon.max_discount_amount?.toString() || '',
    start_date: coupon.start_date?.split('T')[0] || '',
    end_date: coupon.end_date?.split('T')[0] || '',
    usage_limit: coupon.usage_limit?.toString() || '',
    is_active: coupon.is_active,
  });

  useEffect(() => {
    setFormData({
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      min_booking_amount: coupon.min_booking_amount?.toString() || '',
      max_discount_amount: coupon.max_discount_amount?.toString() || '',
      start_date: coupon.start_date?.split('T')[0] || '',
      end_date: coupon.end_date?.split('T')[0] || '',
      usage_limit: coupon.usage_limit?.toString() || '',
      is_active: coupon.is_active,
    });
  }, [coupon]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          discount_value: parseFloat(formData.discount_value),
          min_booking_amount: formData.min_booking_amount ? parseFloat(formData.min_booking_amount) : null,
          max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
          usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update coupon');
      }

      toast.success('Coupon updated successfully');
      onSuccess();
    } catch (error) {
      logger.error('Error updating coupon:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update coupon');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    field: keyof typeof formData,
    value: string | number | boolean
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Coupon</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Coupon Code</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                placeholder="SUMMER2024"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_type">Discount Type</Label>
              <Select
                value={formData.discount_type}
                onValueChange={(value) => handleChange('discount_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_value">
                {formData.discount_type === 'percentage' ? 'Discount (%)' : 'Discount Amount (₹)'}
              </Label>
              <Input
                id="discount_value"
                type="number"
                value={formData.discount_value}
                onChange={(e) => handleChange('discount_value', e.target.value)}
                placeholder={formData.discount_type === 'percentage' ? '10' : '100'}
                required
                min={0}
                max={formData.discount_type === 'percentage' ? 100 : undefined}
                step={formData.discount_type === 'percentage' ? 1 : 0.01}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_booking_amount">Min Booking Amount (₹)</Label>
              <Input
                id="min_booking_amount"
                type="number"
                value={formData.min_booking_amount}
                onChange={(e) => handleChange('min_booking_amount', e.target.value)}
                placeholder="1000"
                min={0}
                step={0.01}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_discount_amount">Max Discount Amount (₹)</Label>
              <Input
                id="max_discount_amount"
                type="number"
                value={formData.max_discount_amount}
                onChange={(e) => handleChange('max_discount_amount', e.target.value)}
                placeholder="500"
                min={0}
                step={0.01}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usage_limit">Usage Limit</Label>
              <Input
                id="usage_limit"
                type="number"
                value={formData.usage_limit}
                onChange={(e) => handleChange('usage_limit', e.target.value)}
                placeholder="100"
                min={1}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleChange('end_date', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Get 10% off on your first booking"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange('is_active', checked)}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Coupon'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 