'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { SignaturePad } from '@/components/ui/signature-pad';
import { formatDateTime } from '@/lib/utils/time-formatter';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TripInitiationChecklistProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    booking_id: string;
    start_date: string;
    end_date: string;
    total_price: number;
    user?: {
      name: string;
      phone: string;
      email?: string;
    };
    vehicle?: {
      name: string;
    };
  };
  onInitiate: (data: any) => Promise<void>;
}

export function TripInitiationChecklist({
  isOpen,
  onClose,
  booking,
  onInitiate
}: TripInitiationChecklistProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicleRegNo: '',
    customerPresent: false,
    documentsVerified: false,
    customerDetailsVerified: false,
    termsAccepted: false,
    signature: '',
  });

  const handleNext = () => {
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await onInitiate(formData);
      onClose();
    } catch (error) {
      console.error('Error initiating trip:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Trip Initiation Checklist</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {/* Step 1: Vehicle Registration & Verification */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Vehicle Registration & Verification</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Vehicle Registration Number</label>
                  <Input
                    value={formData.vehicleRegNo}
                    onChange={(e) => setFormData({ ...formData, vehicleRegNo: e.target.value })}
                    placeholder="Enter vehicle registration number"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="customerPresent"
                    checked={formData.customerPresent}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, customerPresent: checked as boolean })
                    }
                  />
                  <label htmlFor="customerPresent" className="text-sm font-medium">
                    Customer is present
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="documentsVerified"
                    checked={formData.documentsVerified}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, documentsVerified: checked as boolean })
                    }
                  />
                  <label htmlFor="documentsVerified" className="text-sm font-medium">
                    All documents verified
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="customerDetailsVerified"
                    checked={formData.customerDetailsVerified}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, customerDetailsVerified: checked as boolean })
                    }
                  />
                  <label htmlFor="customerDetailsVerified" className="text-sm font-medium">
                    Customer details verified
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Terms & Signature */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Terms & Signature</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="termsAccepted"
                    checked={formData.termsAccepted}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, termsAccepted: checked as boolean })
                    }
                  />
                  <label htmlFor="termsAccepted" className="text-sm font-medium">
                    I accept the terms and conditions
                  </label>
                </div>
                <div>
                  <label className="text-sm font-medium">Customer Signature</label>
                  <SignaturePad
                    onSave={(signature) => setFormData({ ...formData, signature })}
                  />
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <div className="flex justify-between w-full">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                Back
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              {step < 2 ? (
                <Button onClick={handleNext}>Next</Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Initiating...' : 'Initiate Trip'}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 