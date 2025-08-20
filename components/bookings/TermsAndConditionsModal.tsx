import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import logger from '@/lib/logger';

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export function TermsAndConditionsModal({
  isOpen,
  onClose,
  onAccept,
}: TermsAndConditionsModalProps) {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAccepted(false);
    }
  }, [isOpen]);

  const handleAccept = () => {
    logger.debug('Accept button clicked, checkbox state:', accepted);
    if (accepted) {
      localStorage.setItem('termsAccepted', 'true');
      onAccept();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] sm:w-[500px] p-0 gap-0 bg-white rounded-lg shadow-xl overflow-hidden">
        <DialogHeader className="sticky top-0 z-10 px-4 sm:px-6 py-4 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75">
          <DialogTitle className="text-xl font-semibold text-gray-900">Terms & Conditions</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-180px)] px-4 sm:px-6 py-4">
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-gray-900">1. Vehicle Rental Agreement Terms</h3>
                <ul className="list-disc pl-6 space-y-2 text-sm text-gray-600">
                  <li>The renter must be at least 18 years old and possess a valid driving license.</li>
                  <li>Required documents must be uploaded within 24 hours of booking.</li>
                  <li>The vehicle must be returned in the same condition as received.</li>
                  <li>Any damage to the vehicle will be charged as per our damage policy.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-gray-900">2. Document Requirements</h3>
                <ul className="list-disc pl-6 space-y-2 text-sm text-gray-600">
                  <li>Valid government-issued ID proof</li>
                  <li>Valid driving license</li>
                  <li>Original driving license must be presented during vehicle pickup</li>
                  <li>Additional documents may be required based on vehicle type</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold text-gray-900">3. Cancellation Policy</h3>
                <ul className="list-disc pl-6 space-y-2 text-sm text-gray-600">
                  <li>Free cancellation up to 24 hours before pickup</li>
                  <li>50% refund for cancellations within 24 hours of pickup</li>
                  <li>No refund for no-shows or same-day cancellations</li>
                </ul>
              </div>
            </motion.div>
          </div>
        </ScrollArea>

        <DialogFooter className="sticky bottom-0 w-full px-4 sm:px-6 py-4 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75">
          <div className="flex flex-col w-full gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="terms"
                checked={accepted}
                onCheckedChange={(checked) => setAccepted(checked as boolean)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label
                htmlFor="terms"
                className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the terms and conditions
              </Label>
            </div>
            <div className="flex justify-end gap-3 w-full">
              <Button
                variant="outline"
                onClick={onClose}
                className="px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAccept}
                disabled={!accepted}
                className="px-4 py-2 bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
              >
                Continue to Payment
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 