'use client';

import { useState, useEffect, ChangeEvent, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';
import { CalendarIcon, Loader2, XCircle, Plus, Upload, Trash, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import logger from '@/lib/logger';
import { SignatureCanvas } from '@/components/SignatureCanvas';

interface CreateOfflineBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  // Customer Details
  customerName: string;
  customerDob: string;
  customerAadhaar: string;
  customerPhone: string;
  customerEmail: string;
  dlNumber: string;
  customerAddress: string;
  customerCity: string;
  customerPinCode: string;
  customerState: string;
  
  // Emergency Contacts
  fatherPhone: string;
  motherPhone: string;
  emergencyContact1: string;
  emergencyContact2: string;
  
  // Vehicle & Booking Details
  vehicleId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  totalAmount: number;
  baseRate: number;
  securityDeposit: number;
  paymentMethod: 'cash' | 'upi' | 'card';
  paymentStatus: 'pending' | 'paid';
  paymentReference?: string;
  notes?: string;
  signature?: string;
  
  // Terms & Conditions
  termsAgreed: boolean[];
}

interface Vehicle {
  id: string;
  name: string;
  price_per_hour: number;
  location: string;
  type: string;
}

export default function CreateOfflineBookingModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: CreateOfflineBookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  
  const [expandedSections, setExpandedSections] = useState({
    customerDetails: true,
    emergencyContacts: true,
    vehiclePricing: true,
    rentalPeriod: true,
    notes: true,
    documents: true,
    signature: true,
    terms: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const [dlFrontFile, setDlFrontFile] = useState<File | null>(null);
  const [dlBackFile, setDlBackFile] = useState<File | null>(null);
  const [aadhaarFrontFile, setAadhaarFrontFile] = useState<File | null>(null);
  const [aadhaarBackFile, setAadhaarBackFile] = useState<File | null>(null);
  const [customerPhotoFile, setCustomerPhotoFile] = useState<File | null>(null);

const initialFormData: FormData = {
  customerName: '',
  customerDob: '',
  customerAadhaar: '',
  customerPhone: '',
  customerEmail: '',
  dlNumber: '',
  customerAddress: '',
  customerCity: '',
  customerPinCode: '',
  customerState: '',
    
  fatherPhone: '',
  motherPhone: '',
  emergencyContact1: '',
  emergencyContact2: '',
    
  vehicleId: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  baseRate: 0,
  securityDeposit: 0,
  totalAmount: 0,
  paymentMethod: 'cash',
  paymentStatus: 'pending',
  paymentReference: '',
  notes: '',
  signature: '',
    
  termsAgreed: [false, false, false, false, false]
};

  const [formData, setFormData] = useState<FormData>(initialFormData);

  useEffect(() => {
    if (isOpen) {
      fetchVehicles();
    } else {
      // Reset form when closing
      setFormData(initialFormData);
      setSelectedVehicle(null);
      setDlFrontFile(null);
      setDlBackFile(null);
      setAadhaarFrontFile(null);
      setAadhaarBackFile(null);
      setCustomerPhotoFile(null);
      setSignatureData(null);
    }
  }, [isOpen]);

  const fetchVehicles = async () => {
    try {
      setVehiclesLoading(true);
      const response = await fetch('/api/admin/vehicles');
      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }
      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (error) {
      toast.error('Failed to fetch vehicles');
    } finally {
      setVehiclesLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'vehicleId') {
      const vehicle = vehicles.find(v => v.id === value);
      setSelectedVehicle(vehicle || null);
      
      if (vehicle) {
        // Update base rate if vehicle is selected
        setFormData(prev => ({ 
          ...prev, 
          baseRate: vehicle.price_per_hour,
          // Example calculation
          totalAmount: vehicle.price_per_hour + prev.securityDeposit
        }));
      }
    }
  };

  const handleCheckboxChange = (index: number, checked: boolean) => {
    setFormData(prev => {
      const newTerms = [...prev.termsAgreed];
      newTerms[index] = checked;
      return { ...prev, termsAgreed: newTerms };
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, setFile: (file: File | null) => void) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSignatureChange = (dataUrl: string | null) => {
    setSignatureData(dataUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Validate required fields
      const requiredFields = {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        vehicleId: formData.vehicleId,
        startDate: formData.startDate,
        startTime: formData.startTime,
        endDate: formData.endDate,
        endTime: formData.endTime,
        totalAmount: formData.totalAmount,
        paymentMethod: formData.paymentMethod,
        paymentStatus: formData.paymentStatus
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

      if (missingFields.length > 0) {
        toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
        return;
      }
      
      // Validate documents
      if (!dlFrontFile || !dlBackFile || !aadhaarFrontFile || !aadhaarBackFile || !customerPhotoFile) {
        toast.error('Please upload all required documents');
        return;
      }

      // Validate signature
      if (!signatureData) {
        toast.error('Please add a digital signature');
        return;
      }

      // Validate Terms & Conditions
      if (formData.termsAgreed.some(agreed => !agreed)) {
        toast.error('Please accept all Terms & Conditions');
        return;
      }
      
      // Combine date and time
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      // Create FormData for file uploads
      const formDataToSend = new FormData();
      formDataToSend.append('dlFront', dlFrontFile);
      formDataToSend.append('dlBack', dlBackFile);
      formDataToSend.append('aadhaarFront', aadhaarFrontFile);
      formDataToSend.append('aadhaarBack', aadhaarBackFile);
      formDataToSend.append('customerPhoto', customerPhotoFile);

      // Add other booking data
      formDataToSend.append('customerName', formData.customerName);
      formDataToSend.append('customerPhone', formData.customerPhone);
      formDataToSend.append('customerEmail', formData.customerEmail || '');
      formDataToSend.append('vehicleId', formData.vehicleId);
      formDataToSend.append('startDate', startDateTime.toISOString());
      formDataToSend.append('endDate', endDateTime.toISOString());
      formDataToSend.append('totalAmount', formData.totalAmount.toString());
      formDataToSend.append('paymentMethod', formData.paymentMethod);
      formDataToSend.append('paymentStatus', formData.paymentStatus);
      formDataToSend.append('paymentReference', formData.paymentReference || '');
      formDataToSend.append('signature', signatureData || '');
      formDataToSend.append('notes', formData.notes || '');

      // Submit booking with documents
      const response = await fetch('/api/admin/bookings/offline', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create booking');
      }

      const result = await response.json();
      
      toast.success('Booking created successfully!');
      onSuccess();
      onClose();
      
    } catch (error) {
      logger.error('Error creating offline booking:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Offline Booking</DialogTitle>
          <DialogDescription>
            Enter customer and vehicle details for offline booking
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Details Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Customer Details</h3>
                <Button
                type="button"
                  variant="ghost"
                  size="sm"
                onClick={() => toggleSection('customerDetails')}
              >
                  {expandedSections.customerDetails ? <ChevronUp /> : <ChevronDown />}
                </Button>
              </div>
              
              {expandedSections.customerDetails && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Full Name *</Label>
                    <Input
                      id="customerName"
                      name="customerName" 
                      value={formData.customerName}
                      onChange={handleInputChange} 
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Phone Number *</Label>
                    <Input
                      id="customerPhone"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleInputChange} 
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">Email</Label>
                    <Input
                      id="customerEmail"
                      name="customerEmail" 
                      type="email"
                      value={formData.customerEmail}
                      onChange={handleInputChange} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dlNumber">Driving License Number *</Label>
                    <Input
                      id="dlNumber"
                      name="dlNumber"
                      value={formData.dlNumber}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerAddress">Address *</Label>
                    <Input
                      id="customerAddress"
                      name="customerAddress"
                      value={formData.customerAddress}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerCity">City *</Label>
                    <Input
                      id="customerCity"
                      name="customerCity"
                      value={formData.customerCity}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerState">State *</Label>
                    <Input
                      id="customerState"
                      name="customerState"
                      value={formData.customerState}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerPinCode">PIN Code *</Label>
                    <Input
                      id="customerPinCode"
                      name="customerPinCode"
                      value={formData.customerPinCode}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Emergency Contact Details */}
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-4">Emergency Contact Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fatherPhone">Father's Phone *</Label>
                <Input
                  id="fatherPhone"
                  name="fatherPhone"
                  value={formData.fatherPhone}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motherPhone">Mother's Phone</Label>
                <Input
                  id="motherPhone"
                  name="motherPhone"
                  value={formData.motherPhone}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContact1">Emergency Contact 1 *</Label>
                <Input
                  id="emergencyContact1"
                  name="emergencyContact1"
                  value={formData.emergencyContact1}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContact2">Emergency Contact 2</Label>
                <Input
                  id="emergencyContact2"
                  name="emergencyContact2"
                  value={formData.emergencyContact2}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
          
          {/* Vehicle & Booking Details */}
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-4">Vehicle & Booking Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleId">Select Vehicle *</Label>
                <Select
                  name="vehicleId"
                  value={formData.vehicleId}
                  onValueChange={(value: string) => handleSelectChange('vehicleId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount *</Label>
                <Input
                  id="totalAmount"
                  name="totalAmount"
                  type="number"
                  value={formData.totalAmount}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onValueChange={(value: 'cash' | 'upi' | 'card') => handleSelectChange('paymentMethod', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Payment Status *</Label>
                <Select
                  name="paymentStatus"
                  value={formData.paymentStatus}
                  onValueChange={(value: 'pending' | 'paid') => handleSelectChange('paymentStatus', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentReference">Payment Reference</Label>
                <Input
                  id="paymentReference"
                  name="paymentReference"
                  value={formData.paymentReference}
                  onChange={handleInputChange}
                  placeholder="UPI ID / Card Reference"
                />
              </div>
            </div>
          </div>
          
          {/* Document Upload Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Required Documents</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSection('documents')}
                >
                  {expandedSections.documents ? <ChevronUp /> : <ChevronDown />}
                </Button>
              </div>
              
              {expandedSections.documents && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Driving License Front */}
                  <div className="space-y-2">
                    <Label htmlFor="dlFront">Driving License (Front) *</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="dlFront"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, setDlFrontFile)}
                        required
                      />
                      {dlFrontFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDlFrontFile(null)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {dlFrontFile && (
                      <p className="text-sm text-gray-500">
                        Selected: {dlFrontFile.name}
                      </p>
                    )}
                  </div>

                  {/* Driving License Back */}
                  <div className="space-y-2">
                    <Label htmlFor="dlBack">Driving License (Back) *</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="dlBack"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, setDlBackFile)}
                        required
                      />
                      {dlBackFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDlBackFile(null)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {dlBackFile && (
                      <p className="text-sm text-gray-500">
                        Selected: {dlBackFile.name}
                      </p>
                    )}
                  </div>

                  {/* Aadhaar Front */}
                  <div className="space-y-2">
                    <Label htmlFor="aadhaarFront">Aadhaar Card (Front) *</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="aadhaarFront"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, setAadhaarFrontFile)}
                        required
                      />
                      {aadhaarFrontFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAadhaarFrontFile(null)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {aadhaarFrontFile && (
                      <p className="text-sm text-gray-500">
                        Selected: {aadhaarFrontFile.name}
                      </p>
                    )}
                  </div>

                  {/* Aadhaar Back */}
                  <div className="space-y-2">
                    <Label htmlFor="aadhaarBack">Aadhaar Card (Back) *</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="aadhaarBack"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, setAadhaarBackFile)}
                        required
                      />
                      {aadhaarBackFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setAadhaarBackFile(null)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {aadhaarBackFile && (
                      <p className="text-sm text-gray-500">
                        Selected: {aadhaarBackFile.name}
                      </p>
                    )}
                  </div>

                  {/* Customer Photo */}
                  <div className="space-y-2">
                    <Label htmlFor="customerPhoto">Customer Photo *</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="customerPhoto"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, setCustomerPhotoFile)}
                        required
                      />
                      {customerPhotoFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCustomerPhotoFile(null)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {customerPhotoFile && (
                      <p className="text-sm text-gray-500">
                        Selected: {customerPhotoFile.name}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Notes Section */}
          <div className="mt-6">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Enter any additional notes or comments"
              className="mt-1"
            />
          </div>
          
          {/* Digital Signature Section */}
          <div className="mt-6">
            <Label>Digital Signature *</Label>
            <SignatureCanvas
              onChange={handleSignatureChange}
              required
            />
          </div>
          
          {/* Terms & Conditions Section */}
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-4">Terms & Conditions</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="terms1"
                    checked={formData.termsAgreed[0]}
                    onChange={(e) => {
                      const newTerms = [...formData.termsAgreed];
                      newTerms[0] = e.target.checked;
                      setFormData({ ...formData, termsAgreed: newTerms });
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="terms1" className="text-sm text-gray-700">
                    I agree to the rental terms and conditions, including vehicle usage guidelines and maintenance requirements.
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="terms2"
                    checked={formData.termsAgreed[1]}
                    onChange={(e) => {
                      const newTerms = [...formData.termsAgreed];
                      newTerms[1] = e.target.checked;
                      setFormData({ ...formData, termsAgreed: newTerms });
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="terms2" className="text-sm text-gray-700">
                    I understand and agree to the security deposit terms and refund policy.
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="terms3"
                    checked={formData.termsAgreed[2]}
                    onChange={(e) => {
                      const newTerms = [...formData.termsAgreed];
                      newTerms[2] = e.target.checked;
                      setFormData({ ...formData, termsAgreed: newTerms });
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="terms3" className="text-sm text-gray-700">
                    I confirm that all provided documents are authentic and valid.
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="terms4"
                    checked={formData.termsAgreed[3]}
                    onChange={(e) => {
                      const newTerms = [...formData.termsAgreed];
                      newTerms[3] = e.target.checked;
                      setFormData({ ...formData, termsAgreed: newTerms });
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="terms4" className="text-sm text-gray-700">
                    I agree to the cancellation policy and understand the charges involved.
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="terms5"
                    checked={formData.termsAgreed[4]}
                    onChange={(e) => {
                      const newTerms = [...formData.termsAgreed];
                      newTerms[4] = e.target.checked;
                      setFormData({ ...formData, termsAgreed: newTerms });
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="terms5" className="text-sm text-gray-700">
                    I accept responsibility for any damages or violations during the rental period.
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Booking'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 