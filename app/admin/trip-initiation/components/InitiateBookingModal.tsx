'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle, AlertCircle, FileText, UserCircle, Car, Camera, Calendar, PlayCircle, Upload, RefreshCw } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/time-formatter';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import { toast } from 'sonner';
import logger from '@/lib/logger';
import { SignatureCanvas } from '@/components/ui/SignatureCanvas';
import { DrawerDialog } from '@/components/ui/drawer-dialog';
import { cn } from '@/lib/utils';

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

interface DocumentFiles {
  dlFront: File | null;
  dlBack: File | null;
  aadhaarFront: File | null;
  aadhaarBack: File | null;
  customerPhoto: File | null;
}

interface DocumentPreviews {
  dlFront: string | null;
  dlBack: string | null;
  aadhaarFront: string | null;
  aadhaarBack: string | null;
  customerPhoto: string | null;
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
    customerBriefed: false,
    fuelLevelChecked: false,
    odometerRecorded: false,
    damageInspection: false,
    cleanlinessCheck: false,
    lightsIndicators: false,
    brakesFunctional: false,
    tiresPressure: false
  });

  const [operationalData, setOperationalData] = useState({
    fuelLevel: '',
    odometerReading: '',
    damageNotes: '',
    cleanlinessNotes: '',
    inspectionPhotos: [] as string[]
  });

  const [documentFiles, setDocumentFiles] = useState<DocumentFiles>({
    dlFront: null,
    dlBack: null,
    aadhaarFront: null,
    aadhaarBack: null,
    customerPhoto: null
  });

  const [documentPreviews, setDocumentPreviews] = useState<DocumentPreviews>({
    dlFront: booking.documents?.dlFront || null,
    dlBack: booking.documents?.dlBack || null,
    aadhaarFront: booking.documents?.aadhaarFront || null,
    aadhaarBack: booking.documents?.aadhaarBack || null,
    customerPhoto: booking.documents?.customerPhoto || null
  });

  // File input references
  const fileInputRefs = {
    dlFront: useRef<HTMLInputElement>(null),
    dlBack: useRef<HTMLInputElement>(null),
    aadhaarFront: useRef<HTMLInputElement>(null),
    aadhaarBack: useRef<HTMLInputElement>(null),
    customerPhoto: useRef<HTMLInputElement>(null)
  };


  const [signatureData, setSignatureData] = useState<string | null>(booking.documents?.signature || null);
  const [activeTab, setActiveTab] = useState('customer');

  const tabSequence = ['customer', 'vehicle', 'operational', 'documents', 'checklist'];

  const handleNext = () => {
    const currentIndex = tabSequence.indexOf(activeTab);
    if (currentIndex < tabSequence.length - 1) {
      setActiveTab(tabSequence[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const currentIndex = tabSequence.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabSequence[currentIndex - 1]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleChecklistChange = (item: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const allChecklistItemsComplete = () => Object.values(checklist).every(item => item === true);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: keyof DocumentFiles) => {
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

  const handleFileUpload = async (type: keyof DocumentFiles) => {
    try {
      // ... existing code ...
      toast.success("Success", {
        description: "File uploaded successfully",
      });
    } catch (error) {
      toast.error("Error", {
        description: "Failed to upload file. Please try again.",
      });
    }
  };

  const handleSignatureUpload = async () => {
    try {
      // ... existing code ...
      toast.success("Success", {
        description: "Signature uploaded successfully",
      });
    } catch (error) {
      toast.error("Error", {
        description: "Failed to upload signature. Please try again.",
      });
    }
  };

  const handleInitiateTrip = async () => {
    try {
      setLoading(true);

      // Validate that all essential information is provided
      if (!customerInfo.name || !customerInfo.phone) {
        toast.warning("Missing Information", {
          description: "Customer name and phone number are required",
        });
        setLoading(false);
        return;
      }

      // Validate required documents
      const requiredDocuments = ['dlFront', 'dlBack', 'aadhaarFront', 'aadhaarBack', 'customerPhoto'] as const;
      const missingDocuments = requiredDocuments.filter(doc =>
        !documentFiles[doc] && !documentPreviews[doc]
      );

      if (missingDocuments.length > 0) {
        toast.warning("Missing Documents", {
          description: `Please upload: ${missingDocuments.join(', ')}`,
        });
        setLoading(false);
        return;
      }

      // Validate signature
      if (!signatureData) {
        toast.warning("Missing Signature", {
          description: "Customer signature is required",
        });
        setLoading(false);
        return;
      }

      // Validate checklist
      if (!allChecklistItemsComplete()) {
        toast.warning("Incomplete Checklist", {
          description: "Please complete all checklist items before initiating the trip",
        });
        setLoading(false);
        return;
      }

      // Create FormData for file uploads
      const formData = new FormData();

      // Append customer info
      formData.append('customerInfo', JSON.stringify(customerInfo));
      formData.append('tripNotes', tripNotes);
      formData.append('vehicleNumber', vehicleNumber);
      formData.append('termsAccepted', String(termsAccepted));
      formData.append('checklist', JSON.stringify(checklist));

      // Append operational data
      formData.append('fuelLevel', operationalData.fuelLevel);
      formData.append('odometerReading', operationalData.odometerReading);
      formData.append('damageNotes', operationalData.damageNotes);
      formData.append('cleanlinessNotes', operationalData.cleanlinessNotes);

      // Append new document files if they exist
      (Object.entries(documentFiles) as [keyof DocumentFiles, File | null][]).forEach(([key, file]) => {
        if (file) {
          formData.append(key, file);
        }
      });

      // Append signature if it exists
      if (signatureData) {
        // Convert base64 to blob manually to avoid CSP issues with fetch('data:...')
        const dataURLtoBlob = (dataurl: string) => {
          const arr = dataurl.split(',');
          const mimeMatch = arr[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'image/png';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          return new Blob([u8arr], { type: mime });
        };

        const signatureBlob = dataURLtoBlob(signatureData);
        formData.append('signature', signatureBlob, 'signature.png');
      }

      // Send request to API
      const response = await fetch(`/api/admin/bookings/${booking.id}/initiate`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to initiate trip');
      }

      toast.success("Success", {
        description: "Trip initiated successfully",
      });

      onInitiated(booking.id);
      onClose();
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to initiate trip. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full flex-1 flex flex-col overflow-hidden"
    >
      <div className="px-4 md:px-6 pt-2 sticky top-0 bg-background z-10 border-b">
        <TabsList className="flex w-full md:grid md:grid-cols-5 mb-4 overflow-x-auto scrollbar-hide justify-start md:justify-center p-1 h-auto gap-2">
          <TabsTrigger value="customer" className="flex items-center gap-1 flex-shrink-0 min-w-[100px] md:min-w-0">
            <UserCircle className="h-4 w-4" />
            Customer
          </TabsTrigger>
          <TabsTrigger value="vehicle" className="flex items-center gap-1 flex-shrink-0 min-w-[100px] md:min-w-0">
            <Car className="h-4 w-4" />
            Vehicle
          </TabsTrigger>
          <TabsTrigger value="operational" className="flex items-center gap-1 flex-shrink-0 min-w-[100px] md:min-w-0">
            <CheckCircle className="h-4 w-4" />
            Inspection
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-1 flex-shrink-0 min-w-[100px] md:min-w-0">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="checklist" className="flex items-center gap-1 flex-shrink-0 min-w-[100px] md:min-w-0">
            <PlayCircle className="h-4 w-4" />
            Checklist
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Customer Information Tab */}
        <TabsContent value="customer" className="mt-0 h-full">
          <div className="space-y-4 pb-20 md:pb-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-lg font-medium">Customer Information</h3>
              {booking.missing_info && booking.missing_info.length > 0 ? (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {booking.missing_info.length} Missing Fields
                </Badge>
              ) : (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Complete
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-base md:text-sm font-medium">Full Name*</label>
                <Input
                  name="name"
                  value={customerInfo.name}
                  onChange={handleInputChange}
                  placeholder="Customer's full name"
                  required
                  className={cn("h-12 md:h-10 text-base md:text-sm", !customerInfo.name ? "border-red-500" : "")}
                />
                {!customerInfo.name && (
                  <p className="text-xs text-red-500">Name is required</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-base md:text-sm font-medium">Phone Number*</label>
                <Input
                  name="phone"
                  value={customerInfo.phone}
                  onChange={handleInputChange}
                  placeholder="Customer's phone number"
                  required
                  className={cn("h-12 md:h-10 text-base md:text-sm", !customerInfo.phone ? "border-red-500" : "")}
                />
                {!customerInfo.phone && (
                  <p className="text-xs text-red-500">Phone number is required</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-base md:text-sm font-medium">Email Address</label>
                <Input
                  name="email"
                  value={customerInfo.email}
                  onChange={handleInputChange}
                  placeholder="Customer's email address"
                  type="email"
                  className="h-12 md:h-10 text-base md:text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-base md:text-sm font-medium">DL Number</label>
                <Input
                  name="dlNumber"
                  value={customerInfo.dlNumber}
                  onChange={handleInputChange}
                  placeholder="Driving License Number"
                  className="h-12 md:h-10 text-base md:text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-base md:text-sm font-medium">Aadhaar Number</label>
                <Input
                  name="aadhaarNumber"
                  value={customerInfo.aadhaarNumber}
                  onChange={handleInputChange}
                  placeholder="Aadhaar Number"
                  className="h-12 md:h-10 text-base md:text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-base md:text-sm font-medium">Date of Birth</label>
                <Input
                  name="dob"
                  value={customerInfo.dob}
                  onChange={handleInputChange}
                  placeholder="Date of Birth"
                  className="h-12 md:h-10 text-base md:text-sm"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-base md:text-sm font-medium">Address</label>
                <Textarea
                  name="address"
                  value={customerInfo.address}
                  onChange={handleInputChange}
                  placeholder="Customer's address"
                  rows={3}
                  className="text-base md:text-sm min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-base md:text-sm font-medium">Emergency Contact</label>
                <Input
                  name="emergencyContact"
                  value={customerInfo.emergencyContact}
                  onChange={handleInputChange}
                  placeholder="Emergency contact number"
                  className="h-12 md:h-10 text-base md:text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-base md:text-sm font-medium">Emergency Contact Name</label>
                <Input
                  name="emergencyName"
                  value={customerInfo.emergencyName}
                  onChange={handleInputChange}
                  placeholder="Emergency contact name"
                  className="h-12 md:h-10 text-base md:text-sm"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Vehicle Information Tab */}
        <TabsContent value="vehicle" className="mt-0 h-full">
          <div className="space-y-4 pb-20 md:pb-0">
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
                <label className="text-base md:text-sm font-medium">Vehicle Number</label>
                <Input
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="Enter vehicle registration number"
                  className="h-12 md:h-10 text-base md:text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-base md:text-sm font-medium">Trip Notes</label>
                <Textarea
                  value={tripNotes}
                  onChange={(e) => setTripNotes(e.target.value)}
                  placeholder="Add notes about the vehicle condition, special arrangements, etc."
                  rows={3}
                  className="text-base md:text-sm min-h-[80px]"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Operational Inspection Tab */}
        <TabsContent value="operational" className="mt-0 h-full">
          <div className="space-y-4 pb-20 md:pb-0">
            <h3 className="text-lg font-medium">Pre-Rental Vehicle Inspection</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700 bg-gray-100 p-2 rounded md:bg-transparent md:p-0">Operational Data</h4>

                <div className="space-y-2">
                  <label className="text-base md:text-sm font-medium">Fuel Level (%)</label>
                  <Input
                    type="number"
                    value={operationalData.fuelLevel}
                    onChange={(e) => setOperationalData(prev => ({ ...prev, fuelLevel: e.target.value }))}
                    placeholder="Enter current fuel level (0-100)"
                    min={0}
                    max={100}
                    className="h-12 md:h-10 text-base md:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-base md:text-sm font-medium">Odometer Reading (km)</label>
                  <Input
                    type="number"
                    value={operationalData.odometerReading}
                    onChange={(e) => setOperationalData(prev => ({ ...prev, odometerReading: e.target.value }))}
                    placeholder="Enter current mileage"
                    min={0}
                    className="h-12 md:h-10 text-base md:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-700 bg-gray-100 p-2 rounded md:bg-transparent md:p-0">Inspection Notes</h4>

                <div className="space-y-2">
                  <label className="text-base md:text-sm font-medium">Damage Assessment</label>
                  <Textarea
                    value={operationalData.damageNotes}
                    onChange={(e) => setOperationalData(prev => ({ ...prev, damageNotes: e.target.value }))}
                    placeholder="Note any existing damages, scratches, dents, etc."
                    rows={3}
                    className="text-base md:text-sm min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-base md:text-sm font-medium">Cleanliness Check</label>
                  <Textarea
                    value={operationalData.cleanlinessNotes}
                    onChange={(e) => setOperationalData(prev => ({ ...prev, cleanlinessNotes: e.target.value }))}
                    placeholder="Note vehicle cleanliness and any required cleaning"
                    rows={3}
                    className="text-base md:text-sm min-h-[80px]"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-700 bg-gray-100 p-2 rounded md:bg-transparent md:p-0">Vehicle Safety Checklist</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
                {[
                  { key: 'fuelLevelChecked', label: 'Fuel level verified' },
                  { key: 'odometerRecorded', label: 'Odometer reading recorded' },
                  { key: 'damageInspection', label: 'Damage inspection completed' },
                  { key: 'cleanlinessCheck', label: 'Cleanliness check completed' },
                  { key: 'lightsIndicators', label: 'Lights and indicators working' },
                  { key: 'brakesFunctional', label: 'Brakes functional' },
                  { key: 'tiresPressure', label: 'Tires pressure checked' }
                ].map((item) => (
                  <div key={item.key} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md md:bg-transparent md:p-0 md:space-x-2 border md:border-none">
                    <input
                      type="checkbox"
                      id={item.key}
                      checked={checklist[item.key as keyof typeof checklist]}
                      onChange={() => handleChecklistChange(item.key as keyof typeof checklist)}
                      className="h-5 w-5 md:h-4 md:w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor={item.key} className="text-base md:text-sm text-gray-700 cursor-pointer flex-1">
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Inspection Summary</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>Fuel Level: {operationalData.fuelLevel || 'Not recorded'}%</p>
                <p>Odometer: {operationalData.odometerReading || 'Not recorded'} km</p>
                <p>Damage Notes: {operationalData.damageNotes || 'None'}</p>
                <p>Cleanliness: {operationalData.cleanlinessNotes || 'Not checked'}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-0 h-full">
          <div className="space-y-6 pb-20 md:pb-0">
            <h3 className="text-lg font-medium">Required Documents</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4">
              {[
                { key: 'dlFront' as const, label: 'Driving License (Front)', preview: documentPreviews.dlFront },
                { key: 'dlBack' as const, label: 'Driving License (Back)', preview: documentPreviews.dlBack },
                { key: 'aadhaarFront' as const, label: 'Aadhaar Card (Front)', preview: documentPreviews.aadhaarFront },
                { key: 'aadhaarBack' as const, label: 'Aadhaar Card (Back)', preview: documentPreviews.aadhaarBack },
                { key: 'customerPhoto' as const, label: 'Customer Photo', preview: documentPreviews.customerPhoto }
              ].map((doc) => (
                <div key={doc.key} className="border rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-base md:text-sm">{doc.label}</h4>
                    {doc.preview ? (
                      <Badge variant="default" className="flex items-center gap-1">
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

                  <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center rounded-md overflow-hidden mb-3">
                    {doc.preview ? (
                      <img
                        src={doc.preview}
                        alt={doc.label}
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
                    ref={fileInputRefs[doc.key]}
                    onChange={(e) => handleFileChange(e, doc.key)}
                    accept="image/*"
                    className="hidden"
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-10 md:h-9 flex items-center justify-center gap-2"
                    onClick={() => triggerFileInput(doc.key)}
                  >
                    <Upload className="h-4 w-4" />
                    {doc.preview ? 'Change Image' : 'Upload Image'}
                  </Button>
                </div>
              ))}

              {/* Terms & Conditions Section */}
              <div className="border rounded-md p-4 col-span-1 md:col-span-2">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">Terms & Conditions</h4>
                  {termsAccepted ? (
                    <Badge variant="default" className="flex items-center gap-1">
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

                <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-md border md:bg-transparent md:border-none md:p-0">
                  <input
                    type="checkbox"
                    id="termsAccepted"
                    checked={termsAccepted}
                    onChange={() => setTermsAccepted(!termsAccepted)}
                    className="mt-1 h-5 w-5 md:h-4 md:w-4"
                  />
                  <div>
                    <label htmlFor="termsAccepted" className="font-medium text-base md:text-sm cursor-pointer">
                      I confirm that the customer has read and agreed to the Terms & Conditions
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Customer must accept the terms before trip initiation
                    </p>
                  </div>
                </div>
              </div>

              {/* Signature */}
              <div className="border rounded-md p-4 space-y-3 col-span-1 md:col-span-2">
                <h4 className="font-medium">Customer Signature</h4>
                <p className="text-sm text-gray-500">Have the customer sign below to acknowledge the vehicle condition and booking details.</p>

                <div className="w-full overflow-hidden border border-gray-200 rounded bg-white">
                  <SignatureCanvas
                    initialValue={signatureData}
                    onChange={handleSignatureChange}
                    label="Customer Signature"
                    required={true}
                    instructionText="Customer, please sign here"
                    errorMessage="Customer signature is required"
                    width={0} // Responsive width
                    height={180}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="mt-0 h-full">
          <div className="space-y-4 pb-20 md:pb-0">
            <h3 className="text-lg font-medium">Pre-Trip Checklist</h3>
            <p className="text-sm text-gray-500">Please verify all items before initiating the trip</p>

            <div className="space-y-3">
              {[
                { key: 'identityVerified', title: 'Identity Verified', desc: "Confirm that the customer's identity matches provided ID" },
                { key: 'documentsVerified', title: 'Documents Verified', desc: 'Verify that all required documents are valid and authentic' },
                { key: 'paymentConfirmed', title: 'Payment Confirmed', desc: 'Verify that all payments have been received and processed' },
                { key: 'vehicleChecked', title: 'Vehicle Checked', desc: 'Confirm that the vehicle has been inspected and is ready' },
                { key: 'customerBriefed', title: 'Customer Briefed', desc: 'Confirm the customer has been briefed on vehicle usage and return policies' }
              ].map((item) => (
                <div key={item.key} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-md border md:p-3">
                  <input
                    type="checkbox"
                    id={item.key}
                    checked={checklist[item.key as keyof typeof checklist]}
                    onChange={() => handleChecklistChange(item.key as keyof typeof checklist)}
                    className="mt-1 h-5 w-5 md:h-4 md:w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div>
                    <label htmlFor={item.key} className="font-medium text-base md:text-sm cursor-pointer">{item.title}</label>
                    <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
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
      </div>
    </Tabs>
  );

  return (
    <DrawerDialog
      open={isOpen}
      onOpenChange={onClose}
      title={
        <div className="flex items-center gap-2 flex-wrap">
          Trip Initiation: #{booking.booking_id}
          <Badge
            variant={booking.booking_type === 'offline' ? 'secondary' : 'default'}
            className="ml-2"
          >
            {booking.booking_type}
          </Badge>
        </div>
      }
      className="md:max-w-4xl"
      footer={
        <div className="flex w-full gap-2 mt-4 md:mt-0 items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="md:flex-none h-12 md:h-10"
            >
              Cancel
            </Button>

            {activeTab !== 'customer' && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={loading}
                className="gap-2 h-12 md:h-10"
              >
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {activeTab !== 'checklist' ? (
              <Button
                onClick={handleNext}
                disabled={loading}
                className="gap-2 h-12 md:h-10 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleInitiateTrip}
                disabled={loading || !allChecklistItemsComplete() || !customerInfo.name || !customerInfo.phone}
                className="gap-2 md:flex-none h-12 md:h-10"
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
            )}
          </div>
        </div>
      }
    >
      {content}
    </DrawerDialog>
  );
}

export default InitiateBookingModal;