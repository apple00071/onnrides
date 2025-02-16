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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Terms & Conditions</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <div className="max-h-[400px] overflow-y-auto space-y-4 text-sm text-gray-600">
            <p>1. Vehicle Rental Agreement Terms:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The renter must be at least 18 years old and possess a valid driving license.</li>
              <li>Required documents must be uploaded within 24 hours of booking.</li>
              <li>The vehicle must be returned in the same condition as received.</li>
              <li>Any damage to the vehicle will be charged as per our damage policy.</li>
            </ul>

            <p>2. Document Requirements:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Valid government-issued ID proof</li>
              <li>Valid driving license</li>
              <li>Additional documents may be required based on vehicle type</li>
              <li>Documents must be uploaded within 24 hours of booking confirmation</li>
            </ul>

            <p>3. Cancellation Policy:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Free cancellation up to 24 hours before pickup</li>
              <li>Booking may be cancelled if required documents are not uploaded within 24 hours</li>
              <li>Refund will be processed within 5-7 business days</li>
            </ul>
          </div>

          <div className="flex items-center space-x-2 pt-4">
            <Checkbox 
              id="terms" 
              checked={accepted}
              onCheckedChange={(checked) => {
                logger.debug('Checkbox state changing to:', checked);
                setAccepted(checked as boolean);
              }}
            />
            <Label
              htmlFor="terms"
              className="text-sm text-gray-600 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I have read and agree to the terms & conditions
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAccept}
            disabled={!accepted}
          >
            Continue to Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 