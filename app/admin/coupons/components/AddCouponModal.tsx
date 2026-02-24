'use client';

import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import logger from '@/lib/logger';
import { DiscountType } from '@/lib/schema';

interface AddCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCouponModal({ isOpen, onClose, onSuccess }: AddCouponModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as DiscountType,
    discount_value: '',
    min_booking_amount: '',
    max_discount_amount: '',
    start_date: '',
    end_date: '',
    usage_limit: '',
    is_active: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert empty strings to null and format dates
      const payload = {
        ...formData,
        discount_value: Number(formData.discount_value),
        min_booking_amount: formData.min_booking_amount ? Number(formData.min_booking_amount) : null,
        max_discount_amount: formData.max_discount_amount ? Number(formData.max_discount_amount) : null,
        usage_limit: formData.usage_limit ? Number(formData.usage_limit) : null,
        // Add time to dates to make them valid ISO-8601 DateTime strings
        start_date: formData.start_date ? new Date(formData.start_date + 'T00:00:00Z').toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date + 'T23:59:59Z').toISOString() : null,
      };

      const response = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create coupon');
      }

      toast.success('Coupon created successfully');
      onSuccess();
      onClose();
    } catch (error) {
      logger.error('Error creating coupon:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create coupon');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    field: keyof typeof formData,
    value: string | number | boolean
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Coupon</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Coupon Code</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
              placeholder="SUMMER2026"
              required
            />
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

          <div className="space-y-2">
            <Label htmlFor="discount_type">Discount Type</Label>
            <Select
              value={formData.discount_type}
              onValueChange={(value: DiscountType) => handleChange('discount_type', value)}
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

          <div className="space-y-2">
            <Label htmlFor="usage_limit">Usage Limit</Label>
            <Input
              id="usage_limit"
              type="number"
              value={formData.usage_limit}
              onChange={(e) => handleChange('usage_limit', e.target.value)}
              placeholder="100"
              min={0}
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
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Coupon'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 