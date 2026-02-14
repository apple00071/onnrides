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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Booking {
    id: string;
    booking_id: string;
    user_id: string;
    vehicle_id: string;
    start_date: string | Date;
    end_date: string | Date;
    total_price: number;
    total_amount?: number; // Handle both
    status: string;
    payment_status: string;
    payment_method?: string;
    payment_reference?: string;
    notes?: string;
    booking_type: string;
    created_at?: string | Date;
    updated_at?: string | Date;
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

interface InitiateTripModalProps {
    booking: Booking;
    isOpen: boolean;
    onClose: () => void;
    onInitiateSuccess: () => void;
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

export function InitiateTripModal({ booking, isOpen, onClose, onInitiateSuccess }: InitiateTripModalProps) {
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
            const previewUrl = URL.createObjectURL(file);
            setDocumentFiles(prev => ({ ...prev, [type]: file }));
            setDocumentPreviews(prev => ({ ...prev, [type]: previewUrl }));
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
            // Note: Endpoint may need adjustment depending on where we reference it from
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

            onInitiateSuccess();
            onClose();
        } catch (error) {
            toast.error("Error", {
                description: error instanceof Error ? error.message : "Failed to initiate trip. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>Initiate Trip - {booking.booking_id}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    <Tabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                        className="w-full flex-1 flex flex-col overflow-hidden"
                    >
                        <div className="px-4 md:px-6 pt-2 bg-background z-10 border-b">
                            <TabsList className="flex w-full md:grid md:grid-cols-5 mb-2 overflow-x-auto scrollbar-hide justify-start md:justify-center p-1 h-auto gap-2">
                                <TabsTrigger value="customer" className="flex items-center gap-1 flex-shrink-0 min-w-[90px] md:min-w-0 text-xs">
                                    <UserCircle className="h-3.5 w-3.5" />
                                    Customer
                                </TabsTrigger>
                                <TabsTrigger value="vehicle" className="flex items-center gap-1 flex-shrink-0 min-w-[90px] md:min-w-0 text-xs">
                                    <Car className="h-3.5 w-3.5" />
                                    Vehicle
                                </TabsTrigger>
                                <TabsTrigger value="operational" className="flex items-center gap-1 flex-shrink-0 min-w-[90px] md:min-w-0 text-xs">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Inspection
                                </TabsTrigger>
                                <TabsTrigger value="documents" className="flex items-center gap-1 flex-shrink-0 min-w-[90px] md:min-w-0 text-xs">
                                    <FileText className="h-3.5 w-3.5" />
                                    Documents
                                </TabsTrigger>
                                <TabsTrigger value="checklist" className="flex items-center gap-1 flex-shrink-0 min-w-[90px] md:min-w-0 text-xs">
                                    <PlayCircle className="h-3.5 w-3.5" />
                                    Checklist
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                            {/* Customer Information Tab */}
                            <TabsContent value="customer" className="mt-0 h-full">
                                <div className="space-y-4 pb-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Full Name*</label>
                                            <Input
                                                name="name"
                                                value={customerInfo.name}
                                                onChange={handleInputChange}
                                                placeholder="Customer's full name"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Phone Number*</label>
                                            <Input
                                                name="phone"
                                                value={customerInfo.phone}
                                                onChange={handleInputChange}
                                                placeholder="Customer's phone number"
                                                required
                                            />
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
                                                rows={3}
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
                            <TabsContent value="vehicle" className="mt-0 h-full">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-gray-50 rounded-md p-4">
                                            <h4 className="text-xs font-medium text-gray-500 mb-1">Vehicle</h4>
                                            <p className="text-base font-medium">{booking.vehicle?.name || 'N/A'}</p>
                                        </div>

                                        <div className="bg-gray-50 rounded-md p-4">
                                            <h4 className="text-xs font-medium text-gray-500 mb-1">Total Amount</h4>
                                            <p className="text-base font-medium">{formatCurrency(booking.total_amount || booking.total_price || 0)}</p>
                                        </div>

                                        <div className="bg-gray-50 rounded-md p-4">
                                            <h4 className="text-xs font-medium text-gray-500 mb-1">Pick-up Time</h4>
                                            <p className="text-sm">{formatDateTime(booking.start_date)}</p>
                                        </div>

                                        <div className="bg-gray-50 rounded-md p-4">
                                            <h4 className="text-xs font-medium text-gray-500 mb-1">Return Time</h4>
                                            <p className="text-sm">{formatDateTime(booking.end_date)}</p>
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

                            {/* Operational Inspection Tab */}
                            <TabsContent value="operational" className="mt-0 h-full">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4">
                                        <div className="space-y-4">
                                            <h4 className="font-medium text-gray-700 bg-gray-100 p-2 rounded md:bg-transparent md:p-0">Operational Data</h4>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Fuel Level (%)</label>
                                                <Input
                                                    type="number"
                                                    value={operationalData.fuelLevel}
                                                    onChange={(e) => setOperationalData(prev => ({ ...prev, fuelLevel: e.target.value }))}
                                                    placeholder="Enter current fuel level (0-100)"
                                                    min={0}
                                                    max={100}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Odometer Reading (km)</label>
                                                <Input
                                                    type="number"
                                                    value={operationalData.odometerReading}
                                                    onChange={(e) => setOperationalData(prev => ({ ...prev, odometerReading: e.target.value }))}
                                                    placeholder="Enter current mileage"
                                                    min={0}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="font-medium text-gray-700 bg-gray-100 p-2 rounded md:bg-transparent md:p-0">Inspection Notes</h4>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Damage Assessment</label>
                                                <Textarea
                                                    value={operationalData.damageNotes}
                                                    onChange={(e) => setOperationalData(prev => ({ ...prev, damageNotes: e.target.value }))}
                                                    placeholder="Note any existing damages, scratches, dents, etc."
                                                    rows={3}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Cleanliness Check</label>
                                                <Textarea
                                                    value={operationalData.cleanlinessNotes}
                                                    onChange={(e) => setOperationalData(prev => ({ ...prev, cleanlinessNotes: e.target.value }))}
                                                    placeholder="Note vehicle cleanliness and any required cleaning"
                                                    rows={3}
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
                                                    <label htmlFor={item.key} className="text-sm text-gray-700 cursor-pointer flex-1">
                                                        {item.label}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Documents Tab */}
                            <TabsContent value="documents" className="mt-0 h-full">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-medium text-gray-500">Required Documents</h3>
                                            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                                                {Object.values(documentPreviews).filter(Boolean).length}/5 Uploaded
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            {[
                                                { key: 'dlFront' as const, label: 'Driving License (Front)', icon: FileText },
                                                { key: 'dlBack' as const, label: 'Driving License (Back)', icon: FileText },
                                                { key: 'aadhaarFront' as const, label: 'Aadhaar Card (Front)', icon: FileText },
                                                { key: 'aadhaarBack' as const, label: 'Aadhaar Card (Back)', icon: FileText },
                                                { key: 'customerPhoto' as const, label: 'Customer Photo', icon: UserCircle }
                                            ].map((doc) => {
                                                const isUploaded = !!documentPreviews[doc.key];
                                                return (
                                                    <div
                                                        key={doc.key}
                                                        className="flex items-center justify-between p-3 bg-white border rounded-md shadow-sm"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "p-2 rounded-full",
                                                                isUploaded ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
                                                            )}>
                                                                <doc.icon className="h-5 w-5" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium text-gray-900">{doc.label}</span>
                                                                <span className={cn("text-xs", isUploaded ? "text-green-600" : "text-gray-500")}>
                                                                    {isUploaded ? 'Ready' : 'Required'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="file"
                                                                ref={fileInputRefs[doc.key]}
                                                                onChange={(e) => handleFileChange(e, doc.key)}
                                                                accept="image/*"
                                                                className="hidden"
                                                            />

                                                            {isUploaded ? (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => window.open(documentPreviews[doc.key]!, '_blank')}
                                                                        className="text-blue-600 h-8 px-2"
                                                                    >
                                                                        View
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => triggerFileInput(doc.key)}
                                                                        className="h-8 px-3 text-xs"
                                                                    >
                                                                        Change
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => triggerFileInput(doc.key)}
                                                                    className="h-8 gap-2 border-dashed border-gray-400 hover:border-orange-500 hover:text-orange-600"
                                                                >
                                                                    <Upload className="h-3.5 w-3.5" />
                                                                    Upload
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

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
                                                    <label htmlFor="termsAccepted" className="font-medium text-sm cursor-pointer">
                                                        I confirm that the customer has read and agreed to the Terms & Conditions
                                                    </label>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Customer must accept the terms before trip initiation
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Checklist Tab */}
                            <TabsContent value="checklist" className="mt-0 h-full">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium">Final Checklist</h3>
                                        <p className="text-sm text-gray-500">Please verify all items before initiating the trip.</p>

                                        <div className="space-y-3">
                                            {[
                                                { key: 'identityVerified', label: 'Customer identity verified (Original ID checked)' },
                                                { key: 'documentsVerified', label: 'All required documents uploaded and clear' },
                                                { key: 'paymentConfirmed', label: 'Security deposit and rental payment confirmed' },
                                                { key: 'vehicleChecked', label: 'Vehicle inspection completed and recorded' },
                                                { key: 'customerBriefed', label: 'Customer briefed on vehicle controls and rules' }
                                            ].map((item) => (
                                                <div key={item.key} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md border">
                                                    <input
                                                        type="checkbox"
                                                        id={item.key}
                                                        checked={checklist[item.key as keyof typeof checklist]}
                                                        onChange={() => handleChecklistChange(item.key as keyof typeof checklist)}
                                                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <label htmlFor={item.key} className="text-sm font-medium text-gray-700 cursor-pointer flex-1">
                                                        {item.label}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="border-t pt-6">
                                        <h3 className="text-lg font-medium mb-4">Customer Signature</h3>
                                        <div className="border rounded-md p-4 bg-gray-50">
                                            <SignatureCanvas
                                                onChange={handleSignatureChange}
                                                height={200}
                                            />
                                            <div className="mt-2 text-center text-xs text-gray-500">
                                                Sign above to acknowledge vehicle condition and terms
                                            </div>
                                            <div className="mt-2 flex justify-end">
                                                <Button variant="outline" size="sm" onClick={() => setSignatureData(null)}>Clear</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                <DialogFooter className="px-6 py-4 border-t bg-gray-50 sm:justify-between flex-row gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1 sm:flex-none">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleInitiateTrip}
                        disabled={loading}
                        className="bg-orange-600 hover:bg-orange-700 text-white flex-1 sm:flex-none"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Initiating Trip...
                            </>
                        ) : (
                            <>
                                <PlayCircle className="mr-2 h-4 w-4" />
                                Initiate Trip
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
