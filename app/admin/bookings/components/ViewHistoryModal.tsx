'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils/time-formatter';
import { Loader2 } from 'lucide-react';
import logger from '@/lib/logger';

interface Booking {
  id: string;
  booking_id: string;
}

interface HistoryEntry {
  id: string;
  booking_id: string;
  action: string;
  details: string;
  created_at: string;
  created_by: string;
}

interface ViewHistoryModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
}

export function ViewHistoryModal({ booking, isOpen, onClose }: ViewHistoryModalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, booking.booking_id]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/bookings/${booking.booking_id}/history`);
      if (!response.ok) {
        throw new Error('Failed to fetch booking history');
      }
      const data = await response.json();
      setHistory(data.history);
    } catch (error) {
      logger.error('Error fetching booking history:', error);
      setError('Failed to load booking history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Booking History - {booking.booking_id}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No history found for this booking
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Badge>{entry.action}</Badge>
                    <span className="text-xs text-gray-500">
                      {formatDateTime(entry.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {entry.details}
                  </p>
                  <p className="text-xs text-gray-500">
                    By: {entry.created_by}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 