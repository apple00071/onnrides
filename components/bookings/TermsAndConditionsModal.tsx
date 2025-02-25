import { useState } from 'react';
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

  const handleAccept = () => {
    logger.debug('Accept button clicked, checkbox state:', accepted);
    if (accepted) {
      onAccept();
    }
  };

  // Log when modal props change
  console.log('Terms Modal Props:', { isOpen, accepted });

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        logger.debug('Dialog open state changing to:', open);
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto p-0 sm:p-6">
        <DialogHeader className="sticky top-0 bg-white z-10 p-4 sm:p-0 border-b sm:border-none">
          <DialogTitle className="text-lg sm:text-xl font-semibold">Terms & Conditions</DialogTitle>
        </DialogHeader>
        
        <div className="p-4 sm:p-0 space-y-6">
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-gray-900">1. Vehicle Rental Agreement Terms</h3>
              <ul className="list-disc pl-4 sm:pl-6 space-y-2 text-sm text-gray-600">
                <li>The renter must be at least 18 years old and possess a valid driving license.</li>
                <li>Required documents must be uploaded within 24 hours of booking.</li>
                <li>The vehicle must be returned in the same condition as received.</li>
                <li>Any damage to the vehicle will be charged as per our damage policy.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-semibold text-gray-900">2. Document Requirements</h3>
              <ul className="list-disc pl-4 sm:pl-6 space-y-2 text-sm text-gray-600">
                <li>Valid government-issued ID proof</li>
                <li>Valid driving license</li>
                <li>Additional documents may be required based on vehicle type</li>
                <li>Documents must be uploaded within 24 hours of booking confirmation</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-semibold text-gray-900">3. Cancellation Policy</h3>
              <ul className="list-disc pl-4 sm:pl-6 space-y-2 text-sm text-gray-600">
                <li>Free cancellation up to 24 hours before pickup</li>
                <li>Booking may be cancelled if required documents are not uploaded within 24 hours</li>
                <li>Refund will be processed within 5-7 business days</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start sm:items-center space-x-2 border-t pt-4">
            <Checkbox 
              id="terms" 
              checked={accepted}
              onCheckedChange={(checked) => {
                logger.debug('Checkbox state changing to:', checked);
                setAccepted(checked as boolean);
              }}
              className="mt-1 sm:mt-0"
            />
            <Label
              htmlFor="terms"
              className="text-sm text-gray-600 leading-tight sm:leading-none"
            >
              I have read and agree to the terms & conditions
            </Label>
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 bg-white mt-0 p-4 sm:p-0 border-t sm:border-t-0">
          <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAccept}
              disabled={!accepted}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90"
            >
              Continue to Payment
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 