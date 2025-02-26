'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import logger from '@/lib/logger';

interface Coupon {
  id: string;
  code: string;
}

interface DeleteCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  coupon: Coupon;
}

export default function DeleteCouponModal({
  isOpen,
  onClose,
  onSuccess,
  coupon,
}: DeleteCouponModalProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete coupon');
      }

      toast.success('Coupon deleted successfully');
      onSuccess();
    } catch (error) {
      logger.error('Error deleting coupon:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete coupon');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Delete Coupon</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete the coupon <span className="font-semibold">{coupon.code}</span>? This action cannot be undone.
          </p>
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
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete Coupon'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 