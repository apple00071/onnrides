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
import { toast } from '@/hooks/use-toast';
import { CalendarIcon, Loader2, XCircle, Plus, Upload, Trash, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import logger from '@/lib/logger';
import { SignatureCanvas } from '@/components/ui/SignatureCanvas';

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
      toast({
        title: 'Error',
        description: 'Failed to fetch vehicles',
        variant: 'destructive'
      });
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
    
    // Validate required fields
    if (!formData.customerName || !formData.customerPhone || !formData.vehicleId || 
        !formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields',
        variant: 'destructive'
      });
      return;
    }
    
    // Validate signature
    if (!signatureData) {
      toast({
        title: 'Signature Required',
        description: 'Please add a digital signature',
        variant: 'destructive'
      });
      return;
    }
    
    // Validate terms agreement
    if (!formData.termsAgreed.every(Boolean)) {
      toast({
        title: 'Terms Agreement Required',
        description: 'Please agree to all terms and conditions',
        variant: 'destructive'
      });
      return;
    }
    
    // Add signature validation if it's a required section
    if (expandedSections.documents && !signatureData) {
      toast({
        title: "Missing Signature",
        description: "Please have the customer sign before proceeding",
        variant: "destructive"
      });
      return;
    }
    
    try {
    setLoading(true);

      // Combine date and time fields
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
      
      const bookingData = {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        vehicleId: formData.vehicleId,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        totalAmount: formData.totalAmount,
        paymentMethod: formData.paymentMethod,
        paymentStatus: formData.paymentStatus,
        paymentReference: formData.paymentReference,
        notes: formData.notes,
        signature: signatureData
      };
      
      const response = await fetch('/api/admin/bookings/offline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create booking');
      }

      const result = await response.json();
      
      toast({
        title: 'Success',
        description: 'Offline booking created successfully'
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create booking',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">New Booking</DialogTitle>
          <DialogDescription className="text-sm">Create a new booking for a customer.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Details */}
          <Card>
            <CardContent className="pt-3 pb-2 sm:pt-4 sm:pb-3">
              <button 
                type="button"
                className="flex justify-between items-center w-full text-left mb-2" 
                onClick={() => toggleSection('customerDetails')}
              >
                <h3 className="text-base sm:text-lg font-medium">Customer Details</h3>
                {expandedSections.customerDetails ? 
                  <ChevronUp className="h-5 w-5" /> : 
                  <ChevronDown className="h-5 w-5" />
                }
              </button>
              
              {expandedSections.customerDetails && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-2">
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="customerName" className="text-sm">Full Name *</Label>
                    <Input
                      id="customerName"
                      name="customerName" 
                      value={formData.customerName}
                      onChange={handleInputChange} 
                      placeholder="Enter full name" 
                      required 
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>
                  
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="customerDob" className="text-sm">Date of Birth *</Label>
                    <Input 
                      id="customerDob" 
                      name="customerDob" 
                      type="date" 
                      value={formData.customerDob} 
                      onChange={handleInputChange} 
                      required
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="customerAadhaar" className="text-sm">Aadhaar Number *</Label>
                    <Input
                      id="customerAadhaar" 
                      name="customerAadhaar" 
                      value={formData.customerAadhaar} 
                      onChange={handleInputChange} 
                      placeholder="Enter Aadhaar number" 
                      required
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="customerEmail" className="text-sm">Email *</Label>
                    <Input
                      id="customerEmail"
                      name="customerEmail" 
                      type="email"
                      value={formData.customerEmail}
                      onChange={handleInputChange} 
                      placeholder="Enter email address" 
                      required 
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>
                  
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="customerPhone" className="text-sm">Phone *</Label>
                    <Input 
                      id="customerPhone" 
                      name="customerPhone" 
                      value={formData.customerPhone} 
                      onChange={handleInputChange} 
                      placeholder="Enter phone number" 
                      required
                      className="h-10 text-sm sm:text-base" 
                    />
                  </div>
                  
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="dlNumber" className="text-sm">DL Number *</Label>
                    <Input 
                      id="dlNumber" 
                      name="dlNumber" 
                      value={formData.dlNumber} 
                      onChange={handleInputChange} 
                      placeholder="Enter driving license number" 
                      required 
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>
                  
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="customerAddress" className="text-sm">Address *</Label>
                    <Input 
                      id="customerAddress" 
                      name="customerAddress" 
                      value={formData.customerAddress} 
                      onChange={handleInputChange} 
                      placeholder="Enter address" 
                      required 
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>
                  
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="customerCity" className="text-sm">City *</Label>
                    <Input 
                      id="customerCity" 
                      name="customerCity" 
                      value={formData.customerCity} 
                      onChange={handleInputChange} 
                      placeholder="Enter city" 
                      required 
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>
                  
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="customerPinCode" className="text-sm">Pin Code *</Label>
                    <Input 
                      id="customerPinCode" 
                      name="customerPinCode" 
                      value={formData.customerPinCode} 
                      onChange={handleInputChange} 
                      placeholder="Enter pin code" 
                      required 
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>
                  
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="customerState" className="text-sm">State *</Label>
                    <Input 
                      id="customerState" 
                      name="customerState" 
                      value={formData.customerState} 
                      onChange={handleInputChange} 
                      placeholder="Enter state" 
                      required 
                      className="h-10 text-sm sm:text-base"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Emergency Contacts */}
          <Card>
            <CardContent className="pt-4 pb-2">
              <button 
                type="button"
                className="flex justify-between items-center w-full text-left mb-2" 
                onClick={() => toggleSection('emergencyContacts')}
              >
                <h3 className="text-lg font-medium">Emergency Contacts</h3>
                {expandedSections.emergencyContacts ? 
                  <ChevronUp className="h-5 w-5" /> : 
                  <ChevronDown className="h-5 w-5" />
                }
              </button>
              
              {expandedSections.emergencyContacts && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="fatherPhone">Father's Phone</Label>
                    <Input 
                      id="fatherPhone" 
                      name="fatherPhone" 
                      value={formData.fatherPhone} 
                      onChange={handleInputChange} 
                      placeholder="Enter father's phone number" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="motherPhone">Mother's Phone</Label>
                    <Input 
                      id="motherPhone" 
                      name="motherPhone" 
                      value={formData.motherPhone} 
                      onChange={handleInputChange} 
                      placeholder="Enter mother's phone number" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact1">Emergency Contact 1</Label>
                    <Input 
                      id="emergencyContact1" 
                      name="emergencyContact1" 
                      value={formData.emergencyContact1} 
                      onChange={handleInputChange} 
                      placeholder="Enter emergency contact number" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact2">Emergency Contact 2</Label>
                    <Input 
                      id="emergencyContact2" 
                      name="emergencyContact2" 
                      value={formData.emergencyContact2} 
                      onChange={handleInputChange} 
                      placeholder="Enter alternative emergency contact" 
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle & Pricing */}
          <Card>
            <CardContent className="pt-4 pb-2">
              <button 
                type="button"
                className="flex justify-between items-center w-full text-left mb-2" 
                onClick={() => toggleSection('vehiclePricing')}
              >
                <h3 className="text-lg font-medium">Vehicle & Pricing</h3>
                {expandedSections.vehiclePricing ? 
                  <ChevronUp className="h-5 w-5" /> : 
                  <ChevronDown className="h-5 w-5" />
                }
              </button>
              
              {expandedSections.vehiclePricing && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="vehicleId">Vehicle *</Label>
                    <Select
                      onValueChange={(value: string) => handleSelectChange('vehicleId', value)}
                      value={formData.vehicleId}
                      disabled={vehiclesLoading}
                    >
                      <SelectTrigger id="vehicleId">
                        <SelectValue placeholder={vehiclesLoading ? "Loading vehicles..." : "Select a vehicle"} />
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

                  {selectedVehicle && (
                    <div className="md:col-span-2 p-3 bg-gray-50 rounded-md">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="font-medium">{selectedVehicle.name}</span>
                        <Badge variant="outline">{formatCurrency(selectedVehicle.price_per_hour)}/hour</Badge>
                        <span className="text-sm text-gray-500 ml-auto">
                          Location: {selectedVehicle.location}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="baseRate">Base Rate (₹) *</Label>
                    <Input
                      id="baseRate" 
                      name="baseRate" 
                      type="number" 
                      value={formData.baseRate.toString()} 
                      onChange={handleInputChange} 
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="securityDeposit">Security Deposit (₹) *</Label>
                    <Input
                      id="securityDeposit" 
                      name="securityDeposit" 
                      type="number" 
                      value={formData.securityDeposit.toString()} 
                      onChange={handleInputChange} 
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="totalAmount">Total Amount (₹) *</Label>
                    <Input
                      id="totalAmount"
                      name="totalAmount" 
                      type="number"
                      value={formData.totalAmount.toString()} 
                      onChange={handleInputChange} 
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method *</Label>
                    <Select
                      onValueChange={(value: string) => handleSelectChange('paymentMethod', value as 'cash' | 'upi' | 'card')}
                      value={formData.paymentMethod}
                    >
                      <SelectTrigger id="paymentMethod">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Rental Period */}
          <Card>
            <CardContent className="pt-4 pb-2">
              <button 
                type="button"
                className="flex justify-between items-center w-full text-left mb-2" 
                onClick={() => toggleSection('rentalPeriod')}
              >
                <h3 className="text-lg font-medium">Rental Period</h3>
                {expandedSections.rentalPeriod ? 
                  <ChevronUp className="h-5 w-5" /> : 
                  <ChevronDown className="h-5 w-5" />
                }
              </button>
              
              {expandedSections.rentalPeriod && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <div className="flex">
                      <Input 
                        id="startDate" 
                        name="startDate" 
                        type="date" 
                        value={formData.startDate} 
                        onChange={handleInputChange} 
                        required 
                      />
                      <CalendarIcon className="w-4 h-4 ml-2 text-gray-500 self-center" />
                    </div>
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
                    <div className="flex">
                      <Input 
                        id="endDate" 
                        name="endDate" 
                        type="date" 
                        value={formData.endDate} 
                        onChange={handleInputChange} 
                        required 
                      />
                      <CalendarIcon className="w-4 h-4 ml-2 text-gray-500 self-center" />
                    </div>
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
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="pt-4 pb-2">
              <button 
                type="button"
                className="flex justify-between items-center w-full text-left mb-2" 
                onClick={() => toggleSection('notes')}
              >
                <h3 className="text-lg font-medium">Notes</h3>
                {expandedSections.notes ? 
                  <ChevronUp className="h-5 w-5" /> : 
                  <ChevronDown className="h-5 w-5" />
                }
              </button>
              
              {expandedSections.notes && (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="notes">Additional Information</Label>
                  <Textarea
                    id="notes"
                    name="notes" 
                    value={formData.notes || ''} 
                    onChange={handleInputChange} 
                    placeholder="Enter any additional notes or special requirements" 
                    rows={3}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Upload */}
          <Card>
            <CardContent className="pt-4 pb-2">
              <button 
                type="button"
                className="flex justify-between items-center w-full text-left mb-2" 
                onClick={() => toggleSection('documents')}
              >
                <h3 className="text-lg font-medium">Document Upload</h3>
                {expandedSections.documents ? 
                  <ChevronUp className="h-5 w-5" /> : 
                  <ChevronDown className="h-5 w-5" />
                }
              </button>
              
              {expandedSections.documents && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="dlFront">DL Front *</Label>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById('dlFront')?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        {dlFrontFile ? dlFrontFile.name : 'Choose file...'}
                      </Button>
                      <input 
                        id="dlFront" 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => handleFileChange(e, setDlFrontFile)} 
                      />
                      {dlFrontFile && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setDlFrontFile(null)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dlBack">DL Back *</Label>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById('dlBack')?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        {dlBackFile ? dlBackFile.name : 'Choose file...'}
                      </Button>
                      <input 
                        id="dlBack" 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => handleFileChange(e, setDlBackFile)} 
                      />
                      {dlBackFile && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setDlBackFile(null)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="aadhaarFront">Aadhaar Front *</Label>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById('aadhaarFront')?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        {aadhaarFrontFile ? aadhaarFrontFile.name : 'Choose file...'}
                      </Button>
                      <input 
                        id="aadhaarFront" 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => handleFileChange(e, setAadhaarFrontFile)} 
                      />
                      {aadhaarFrontFile && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setAadhaarFrontFile(null)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="aadhaarBack">Aadhaar Back *</Label>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById('aadhaarBack')?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        {aadhaarBackFile ? aadhaarBackFile.name : 'Choose file...'}
                      </Button>
                      <input 
                        id="aadhaarBack" 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => handleFileChange(e, setAadhaarBackFile)} 
                      />
                      {aadhaarBackFile && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setAadhaarBackFile(null)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customerPhoto">Customer Photo *</Label>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" className="w-full" onClick={() => document.getElementById('customerPhoto')?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        {customerPhotoFile ? customerPhotoFile.name : 'Choose file...'}
                      </Button>
                      <input 
                        id="customerPhoto" 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, setCustomerPhotoFile)} 
                      />
                      {customerPhotoFile && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setCustomerPhotoFile(null)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Signature */}
          <Card>
            <CardContent className="pt-4 pb-2">
              <button 
                type="button"
                className="flex justify-between items-center w-full text-left mb-2" 
                onClick={() => toggleSection('signature')}
              >
                <h3 className="text-lg font-medium">Digital Signature</h3>
                {expandedSections.signature ? 
                  <ChevronUp className="h-5 w-5" /> : 
                  <ChevronDown className="h-5 w-5" />
                }
              </button>
              
              {expandedSections.signature && (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="signature">Customer Signature *</Label>
                  <SignatureCanvas
                    initialValue={signatureData}
                    onChange={handleSignatureChange}
                    required={true}
                    instructionText="Customer, please sign here"
                    errorMessage="Customer signature is required to complete booking"
                  />
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Terms & Conditions */}
          <Card>
            <CardContent className="pt-4 pb-2">
              <button 
                type="button"
                className="flex justify-between items-center w-full text-left mb-2" 
                onClick={() => toggleSection('terms')}
              >
                <h3 className="text-lg font-medium">Terms & Conditions</h3>
                {expandedSections.terms ? 
                  <ChevronUp className="h-5 w-5" /> : 
                  <ChevronDown className="h-5 w-5" />
                }
              </button>
              
              {expandedSections.terms && (
                <div className="space-y-3 mt-2">
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      id="term1" 
                      className="mt-1 w-5 h-5"
                      checked={formData.termsAgreed[0]} 
                      onChange={(e) => handleCheckboxChange(0, e.target.checked)} 
                    />
                    <Label htmlFor="term1" className="font-normal text-sm">
                      Renter must be at least 18 years old with a valid driving license.
                    </Label>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      id="term2" 
                      className="mt-1 w-5 h-5"
                      checked={formData.termsAgreed[1]} 
                      onChange={(e) => handleCheckboxChange(1, e.target.checked)} 
                    />
                    <Label htmlFor="term2" className="font-normal text-sm">
                      Security deposit is applicable and refundable subject to vehicle condition upon return.
                    </Label>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      id="term3" 
                      className="mt-1 w-5 h-5"
                      checked={formData.termsAgreed[2]} 
                      onChange={(e) => handleCheckboxChange(2, e.target.checked)} 
                    />
                    <Label htmlFor="term3" className="font-normal text-sm">
                      Customer is responsible for any traffic violations or fines incurred during rental period.
                    </Label>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      id="term4" 
                      className="mt-1 w-5 h-5"
                      checked={formData.termsAgreed[3]} 
                      onChange={(e) => handleCheckboxChange(3, e.target.checked)} 
                    />
                    <Label htmlFor="term4" className="font-normal text-sm">
                      Vehicle must be returned in the same condition as rented.
                    </Label>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      id="term5" 
                      className="mt-1 w-5 h-5"
                      checked={formData.termsAgreed[4]} 
                      onChange={(e) => handleCheckboxChange(4, e.target.checked)} 
                    />
                    <Label htmlFor="term5" className="font-normal text-sm">
                      I have read and agree to the terms and conditions of the rental agreement.
                    </Label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Form Controls */}
          <div className="flex justify-end space-x-2 sticky bottom-0 bg-white p-2 shadow-md rounded-md mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="min-h-10 min-w-20"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-h-10 min-w-28"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Submit Booking'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 