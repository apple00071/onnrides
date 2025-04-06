'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle, AlertCircle, FileText, UserCircle, Car, Camera, Calendar, PlayCircle, Upload, RefreshCw } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/time-formatter';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import { useToast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import { SignatureCanvas } from '@/components/ui/SignatureCanvas';

interface Booking {
  id: string;
  booking_id: string;
  user_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: 'pending' | 'confirmed' | 'initiated' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'completed' | 'cancelled';
  payment_method?: string;
  payment_reference?: string;
  notes?: string;
  booking_type: 'online' | 'offline';
  created_at: string;
  updated_at: string;
  vehicle?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  documents?: {
    dlFront?: string;
    dlBack?: string;
    aadhaarFront?: string;
    aadhaarBack?: string;
    customerPhoto?: string;
    signature?: string;
  };
  missing_info?: string[];
}

interface InitiateBookingModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onInitiated: (bookingId: string) => void;
}

// Type definitions for request body
interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  dlNumber?: string;
  aadhaarNumber?: string;
  dob?: string;
  address?: string;
  emergencyContact?: string;
  emergencyName?: string;
}

export function InitiateBookingModal({ booking, isOpen, onClose, onInitiated }: InitiateBookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: booking.user?.name || '',
    phone: booking.user?.phone || '',
    email: booking.user?.email || '',
    dlNumber: '',
    aadhaarNumber: '',
    dob: '',
    address: '',
    emergencyContact: '',
    emergencyName: ''
  });
  const [tripNotes, setTripNotes] = useState(booking.notes || '');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [checklist, setChecklist] = useState({
    identityVerified: false,
    documentsVerified: false,
    paymentConfirmed: false,
    vehicleChecked: false,
    customerBriefed: false
  });
  const [documentFiles, setDocumentFiles] = useState<{
    dlFront: File | null;
    dlBack: File | null;
    aadhaarFront: File | null;
    aadhaarBack: File | null;
    customerPhoto: File | null;
    signature: File | null;
  }>({
    dlFront: null,
    dlBack: null,
    aadhaarFront: null,
    aadhaarBack: null,
    customerPhoto: null,
    signature: null
  });
  
  const [documentPreviews, setDocumentPreviews] = useState<{
    dlFront: string | null;
    dlBack: string | null;
    aadhaarFront: string | null;
    aadhaarBack: string | null;
    customerPhoto: string | null;
    signature: string | null;
  }>({
    dlFront: booking.documents?.dlFront || null,
    dlBack: booking.documents?.dlBack || null,
    aadhaarFront: booking.documents?.aadhaarFront || null,
    aadhaarBack: booking.documents?.aadhaarBack || null,
    customerPhoto: booking.documents?.customerPhoto || null,
    signature: booking.documents?.signature || null
  });
  
  // File input references
  const fileInputRefs = {
    dlFront: useRef<HTMLInputElement>(null),
    dlBack: useRef<HTMLInputElement>(null),
    aadhaarFront: useRef<HTMLInputElement>(null),
    aadhaarBack: useRef<HTMLInputElement>(null),
    customerPhoto: useRef<HTMLInputElement>(null),
    signature: useRef<HTMLInputElement>(null)
  };

  const { toast } = useToast();

  const [signatureData, setSignatureData] = useState<string | null>(booking.documents?.signature || null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleChecklistChange = (item: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const allChecklistItemsComplete = () => {
    return Object.values(checklist).every(item => item === true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: keyof typeof documentFiles) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      
      // Update file state
      setDocumentFiles(prev => ({
        ...prev,
        [type]: file
      }));
      
      // Update preview state
      setDocumentPreviews(prev => ({
        ...prev,
        [type]: previewUrl
      }));
    }
  };
  
  const triggerFileInput = (type: keyof typeof fileInputRefs) => {
    if (fileInputRefs[type].current) {
      fileInputRefs[type].current?.click();
    }
  };

  const handleSignatureChange = (dataUrl: string | null) => {
    setSignatureData(dataUrl);
  };

  const handleInitiateTrip = async () => {
    try {
      setLoading(true);
      
      // Validate that all essential information is provided
      if (!customerInfo.name || !customerInfo.phone) {
        toast({
          title: "Missing Information",
          description: "Customer name and phone number are required",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      // Validate terms acceptance
      if (!termsAccepted) {
        toast({
          title: "Terms & Conditions Required",
          description: "Customer must accept the Terms & Conditions before proceeding",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      // Validate signature
      if (!signatureData) {
        toast({
          title: "Missing Signature",
          description: "Please have the customer sign before proceeding",
          variant: "destructive"
        });
        return;
      }
      
      // Validate checklist
      if (!allChecklistItemsComplete()) {
        toast({
          title: "Incomplete Checklist",
          description: "Please complete all checklist items before initiating the trip",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      // Upload any new document files first
      let uploadedDocuments = { ...booking.documents } || {};
      
      // Add signature data to documents
      if (signatureData) {
        uploadedDocuments.signature = signatureData;
      }
      
      const uploadPromises = [];
      
      for (const [key, file] of Object.entries(documentFiles)) {
        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('type', key);
          formData.append('bookingId', booking.id);
          
          const uploadPromise = fetch('/api/admin/upload-document', {
            method: 'POST',
            body: formData
          })
          .then(response => response.json())
          .then(data => {
            if (data.success && data.url) {
              uploadedDocuments[key as keyof typeof uploadedDocuments] = data.url;
            }
          });
          
          uploadPromises.push(uploadPromise);
        }
      }
      
      // Wait for all uploads to complete
      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises);
      }
      
      // Send request to update and initiate the trip
      const response = await fetch(`/api/admin/bookings/${booking.id}/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customer: customerInfo,
          notes: tripNotes,
          checklistCompleted: true,
          vehicleNumber: vehicleNumber,
          documents: uploadedDocuments,
          termsAccepted: termsAccepted
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate trip');
      }
      
      toast({
        title: "Success",
        description: "Trip initiated successfully",
      });
      
      // Clean up any object URLs to prevent memory leaks
      Object.values(documentPreviews).forEach(preview => {
        if (preview && !preview.startsWith('http')) {
          URL.revokeObjectURL(preview);
        }
      });
      
      onInitiated(booking.id);
    } catch (error) {
      logger.error('Error initiating trip:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to initiate trip',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            Trip Initiation: Booking #{booking.booking_id}
            <Badge 
              variant={booking.booking_type === 'offline' ? 'secondary' : 'default'}
              className="ml-2"
            >
              {booking.booking_type}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="customer" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="customer" className="flex items-center gap-1">
              <UserCircle className="h-4 w-4" />
              Customer
            </TabsTrigger>
            <TabsTrigger value="vehicle" className="flex items-center gap-1">
              <Car className="h-4 w-4" />
              Vehicle
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              Checklist
            </TabsTrigger>
          </TabsList>
          
          {/* Customer Information Tab */}
          <TabsContent value="customer" className="mt-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Customer Information</h3>
                {booking.missing_info && booking.missing_info.length > 0 ? (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {booking.missing_info.length} Missing Fields
                  </Badge>
                ) : (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Complete
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name*</label>
                  <Input 
                    name="name"
                    value={customerInfo.name}
                    onChange={handleInputChange}
                    placeholder="Customer's full name"
                    required
                    className={!customerInfo.name ? "border-red-500" : ""}
                  />
                  {!customerInfo.name && (
                    <p className="text-xs text-red-500">Name is required</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number*</label>
                  <Input 
                    name="phone"
                    value={customerInfo.phone}
                    onChange={handleInputChange}
                    placeholder="Customer's phone number"
                    required
                    className={!customerInfo.phone ? "border-red-500" : ""}
                  />
                  {!customerInfo.phone && (
                    <p className="text-xs text-red-500">Phone number is required</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input 
                    name="email"
                    value={customerInfo.email}
                    onChange={handleInputChange}
                    placeholder="Customer's email address"
                    type="email"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">DL Number</label>
                  <Input 
                    name="dlNumber"
                    value={customerInfo.dlNumber}
                    onChange={handleInputChange}
                    placeholder="Driving License Number"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Aadhaar Number</label>
                  <Input 
                    name="aadhaarNumber"
                    value={customerInfo.aadhaarNumber}
                    onChange={handleInputChange}
                    placeholder="Aadhaar Number"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date of Birth</label>
                  <Input 
                    name="dob"
                    value={customerInfo.dob}
                    onChange={handleInputChange}
                    placeholder="Date of Birth"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Address</label>
                  <Textarea 
                    name="address"
                    value={customerInfo.address}
                    onChange={handleInputChange}
                    placeholder="Customer's address"
                    rows={2}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Emergency Contact</label>
                  <Input 
                    name="emergencyContact"
                    value={customerInfo.emergencyContact}
                    onChange={handleInputChange}
                    placeholder="Emergency contact number"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Emergency Contact Name</label>
                  <Input 
                    name="emergencyName"
                    value={customerInfo.emergencyName}
                    onChange={handleInputChange}
                    placeholder="Emergency contact name"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Vehicle Information Tab */}
          <TabsContent value="vehicle" className="mt-0">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Vehicle & Booking Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-md p-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Vehicle</h4>
                  <p className="text-lg font-medium">{booking.vehicle?.name || 'N/A'}</p>
                </div>
                
                <div className="bg-gray-50 rounded-md p-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Total Amount</h4>
                  <p className="text-lg font-medium">{formatCurrency(booking.total_price)}</p>
                </div>
                
                <div className="bg-gray-50 rounded-md p-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Pick-up Time</h4>
                  <p className="text-md">{formatDateTime(booking.start_date)}</p>
                </div>
                
                <div className="bg-gray-50 rounded-md p-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Return Time</h4>
                  <p className="text-md">{formatDateTime(booking.end_date)}</p>
                </div>
                
                <div className="bg-gray-50 rounded-md p-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Payment Method</h4>
                  <p className="text-md">{booking.payment_method || 'N/A'}</p>
                </div>
                
                <div className="bg-gray-50 rounded-md p-4">
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Payment Reference</h4>
                  <p className="text-md">{booking.payment_reference || 'N/A'}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vehicle Number</label>
                  <Input 
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="Enter vehicle registration number"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Trip Notes</label>
                  <Textarea 
                    value={tripNotes}
                    onChange={(e) => setTripNotes(e.target.value)}
                    placeholder="Add notes about the vehicle condition, special arrangements, etc."
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-0">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Required Documents</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* DL Front */}
                <div className="border rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">Driving License (Front)</h4>
                    {documentPreviews.dlFront ? (
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Provided
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Missing
                      </Badge>
                    )}
                  </div>
                  
                  <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center rounded-md overflow-hidden">
                    {documentPreviews.dlFront ? (
                      <img 
                        src={documentPreviews.dlFront} 
                        alt="DL Front" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Camera className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">No document uploaded</p>
                      </div>
                    )}
                  </div>
                  
                  <input
                    type="file"
                    ref={fileInputRefs.dlFront}
                    onChange={(e) => handleFileChange(e, 'dlFront')}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2 flex items-center justify-center gap-1"
                    onClick={() => triggerFileInput('dlFront')}
                  >
                    <Upload className="h-4 w-4" />
                    {documentPreviews.dlFront ? 'Change Image' : 'Upload Image'}
                  </Button>
                </div>
                
                {/* DL Back */}
                <div className="border rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">Driving License (Back)</h4>
                    {documentPreviews.dlBack ? (
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Provided
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Missing
                      </Badge>
                    )}
                  </div>
                  
                  <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center rounded-md overflow-hidden">
                    {documentPreviews.dlBack ? (
                      <img 
                        src={documentPreviews.dlBack} 
                        alt="DL Back" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Camera className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">No document uploaded</p>
                      </div>
                    )}
                  </div>
                  
                  <input
                    type="file"
                    ref={fileInputRefs.dlBack}
                    onChange={(e) => handleFileChange(e, 'dlBack')}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2 flex items-center justify-center gap-1"
                    onClick={() => triggerFileInput('dlBack')}
                  >
                    <Upload className="h-4 w-4" />
                    {documentPreviews.dlBack ? 'Change Image' : 'Upload Image'}
                  </Button>
                </div>
                
                {/* Aadhaar Front */}
                <div className="border rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">Aadhaar Card (Front)</h4>
                    {documentPreviews.aadhaarFront ? (
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Provided
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Missing
                      </Badge>
                    )}
                  </div>
                  
                  <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center rounded-md overflow-hidden">
                    {documentPreviews.aadhaarFront ? (
                      <img 
                        src={documentPreviews.aadhaarFront} 
                        alt="Aadhaar Front" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Camera className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">No document uploaded</p>
                      </div>
                    )}
                  </div>
                  
                  <input
                    type="file"
                    ref={fileInputRefs.aadhaarFront}
                    onChange={(e) => handleFileChange(e, 'aadhaarFront')}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2 flex items-center justify-center gap-1"
                    onClick={() => triggerFileInput('aadhaarFront')}
                  >
                    <Upload className="h-4 w-4" />
                    {documentPreviews.aadhaarFront ? 'Change Image' : 'Upload Image'}
                  </Button>
                </div>
                
                {/* Aadhaar Back */}
                <div className="border rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">Aadhaar Card (Back)</h4>
                    {documentPreviews.aadhaarBack ? (
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Provided
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Missing
                      </Badge>
                    )}
                  </div>
                  
                  <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center rounded-md overflow-hidden">
                    {documentPreviews.aadhaarBack ? (
                      <img 
                        src={documentPreviews.aadhaarBack} 
                        alt="Aadhaar Back" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Camera className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">No document uploaded</p>
                      </div>
                    )}
                  </div>
                  
                  <input
                    type="file"
                    ref={fileInputRefs.aadhaarBack}
                    onChange={(e) => handleFileChange(e, 'aadhaarBack')}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2 flex items-center justify-center gap-1"
                    onClick={() => triggerFileInput('aadhaarBack')}
                  >
                    <Upload className="h-4 w-4" />
                    {documentPreviews.aadhaarBack ? 'Change Image' : 'Upload Image'}
                  </Button>
                </div>
                
                {/* Customer Photo */}
                <div className="border rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">Customer Photo</h4>
                    {documentPreviews.customerPhoto ? (
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Provided
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Missing
                      </Badge>
                    )}
                  </div>
                  
                  <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center rounded-md overflow-hidden">
                    {documentPreviews.customerPhoto ? (
                      <img 
                        src={documentPreviews.customerPhoto} 
                        alt="Customer Photo" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Camera className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">No photo uploaded</p>
                      </div>
                    )}
                  </div>
                  
                  <input
                    type="file"
                    ref={fileInputRefs.customerPhoto}
                    onChange={(e) => handleFileChange(e, 'customerPhoto')}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2 flex items-center justify-center gap-1"
                    onClick={() => triggerFileInput('customerPhoto')}
                  >
                    <Upload className="h-4 w-4" />
                    {documentPreviews.customerPhoto ? 'Change Image' : 'Upload Image'}
                  </Button>
                </div>
                
                {/* Terms & Conditions Section - Added as a full-width section above signature */}
                <div className="border rounded-md p-4 col-span-2">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">Terms & Conditions</h4>
                    {termsAccepted ? (
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Accepted
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Not Accepted
                      </Badge>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md mb-3 max-h-40 overflow-y-auto text-sm">
                    <p className="font-medium mb-2">OnnRides Vehicle Rental Agreement:</p>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>The vehicle must be returned in the same condition as when it was rented.</li>
                      <li>Fuel is the responsibility of the renter. The vehicle should be returned with the same fuel level as when rented.</li>
                      <li>The vehicle should only be driven by the person named in this agreement.</li>
                      <li>Any traffic violations or fines incurred during the rental period are the responsibility of the renter.</li>
                      <li>The vehicle should not be taken outside the agreed geographical boundaries without prior consent.</li>
                      <li>In case of any accident or damage, the renter must inform OnnRides immediately.</li>
                      <li>Personal belongings left in the vehicle are the responsibility of the renter. OnnRides is not liable for any loss or damage.</li>
                      <li>Late returns will incur additional charges as per the hourly/daily rate.</li>
                      <li>The security deposit will be refunded after inspection of the vehicle upon return, minus any applicable charges.</li>
                      <li>Cancellation policy: Cancellations made less than 24 hours before pickup may be subject to a fee.</li>
                    </ol>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <input 
                      type="checkbox" 
                      id="termsAccepted"
                      checked={termsAccepted}
                      onChange={() => setTermsAccepted(!termsAccepted)}
                      className="mt-1"
                    />
                    <div>
                      <label htmlFor="termsAccepted" className="font-medium">
                        I confirm that the customer has read and agreed to the Terms & Conditions
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Customer must accept the terms before trip initiation
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Signature */}
                <div className="border rounded-md p-4 space-y-3">
                  <h4 className="font-medium">Customer Signature</h4>
                  <p className="text-sm text-gray-500">Have the customer sign below to acknowledge the vehicle condition and booking details.</p>
                  
                  <SignatureCanvas
                    initialValue={signatureData}
                    onChange={handleSignatureChange}
                    label="Customer Signature" 
                    required={true}
                    instructionText="Customer, please sign here"
                    errorMessage="Customer signature is required"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Checklist Tab */}
          <TabsContent value="checklist" className="mt-0">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Pre-Trip Checklist</h3>
              <p className="text-sm text-gray-500">Please verify all items before initiating the trip</p>
              
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                  <input 
                    type="checkbox" 
                    id="identityVerified"
                    checked={checklist.identityVerified}
                    onChange={() => handleChecklistChange('identityVerified')}
                    className="mt-1"
                  />
                  <div>
                    <label htmlFor="identityVerified" className="font-medium">Identity Verified</label>
                    <p className="text-sm text-gray-500">Confirm that the customer's identity matches provided ID</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                  <input 
                    type="checkbox" 
                    id="documentsVerified"
                    checked={checklist.documentsVerified}
                    onChange={() => handleChecklistChange('documentsVerified')}
                    className="mt-1"
                  />
                  <div>
                    <label htmlFor="documentsVerified" className="font-medium">Documents Verified</label>
                    <p className="text-sm text-gray-500">Verify that all required documents are valid and authentic</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                  <input 
                    type="checkbox" 
                    id="paymentConfirmed"
                    checked={checklist.paymentConfirmed}
                    onChange={() => handleChecklistChange('paymentConfirmed')}
                    className="mt-1"
                  />
                  <div>
                    <label htmlFor="paymentConfirmed" className="font-medium">Payment Confirmed</label>
                    <p className="text-sm text-gray-500">Verify that all payments have been received and processed</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                  <input 
                    type="checkbox" 
                    id="vehicleChecked"
                    checked={checklist.vehicleChecked}
                    onChange={() => handleChecklistChange('vehicleChecked')}
                    className="mt-1"
                  />
                  <div>
                    <label htmlFor="vehicleChecked" className="font-medium">Vehicle Checked</label>
                    <p className="text-sm text-gray-500">Confirm that the vehicle has been inspected and is ready</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                  <input 
                    type="checkbox" 
                    id="customerBriefed"
                    checked={checklist.customerBriefed}
                    onChange={() => handleChecklistChange('customerBriefed')}
                    className="mt-1"
                  />
                  <div>
                    <label htmlFor="customerBriefed" className="font-medium">Customer Briefed</label>
                    <p className="text-sm text-gray-500">Confirm the customer has been briefed on vehicle usage and return policies</p>
                  </div>
                </div>
              </div>
              
              {!allChecklistItemsComplete() && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Complete All Checklist Items</p>
                      <p>All checklist items must be completed before the trip can be initiated.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6 gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleInitiateTrip}
            disabled={loading || !allChecklistItemsComplete() || !customerInfo.name || !customerInfo.phone}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" />
                {booking.status === 'initiated' ? 'Update Trip' : 'Initiate Trip'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add default export
export default InitiateBookingModal; 