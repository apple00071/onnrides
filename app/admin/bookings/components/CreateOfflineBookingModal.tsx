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
import { formatCurrency } from '@/lib/utils/currency-formatter';
import logger from '@/lib/logger';
import { SignatureCanvas } from '@/components/ui/SignatureCanvas';
import { format } from 'date-fns';

interface CreateOfflineBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Update FormData interface to include termsAgreed
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
  bookingLocation: string;
  useVehicleLocation: boolean;
  registration_number: string;
  termsAgreed: boolean[];
}

// Update Vehicle interface
interface Vehicle {
  id: string;
  name: string;
  registration_number: string;
  price_per_hour: number;
  price_7_days: number | null;
  price_15_days: number | null;
  price_30_days: number | null;
  location: string;
}

// Add locations array
const LOCATIONS = [
  'Madhapur',
  'Erragadda'
];

// Update the calculateRentalPrice function with proper pricing logic
const calculateRentalPrice = (
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string,
  vehicle: Vehicle
): { baseAmount: number } => {
  const start = new Date(`${startDate}T${startTime}`);
  const end = new Date(`${endDate}T${endTime}`);
  const durationHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
  const startDay = start.getDay(); // 0 = Sunday, 1 = Monday, ...
  const isWeekend = startDay === 0 || startDay === 6; // Weekend is Saturday or Sunday
  
  // Validate inputs to prevent NaN results
  const hourlyRate = typeof vehicle.price_per_hour === 'number' && !isNaN(vehicle.price_per_hour) 
    ? vehicle.price_per_hour 
    : 0;
  
  const price7Days = typeof vehicle.price_7_days === 'number' && !isNaN(vehicle.price_7_days) && vehicle.price_7_days > 0
    ? vehicle.price_7_days
    : null;
    
  const price15Days = typeof vehicle.price_15_days === 'number' && !isNaN(vehicle.price_15_days) && vehicle.price_15_days > 0
    ? vehicle.price_15_days
    : null;
    
  const price30Days = typeof vehicle.price_30_days === 'number' && !isNaN(vehicle.price_30_days) && vehicle.price_30_days > 0
    ? vehicle.price_30_days
    : null;

  // First check for special duration pricing
  const durationDays = durationHours / 24;

  // If duration is 30 days or more and 30-day price is set
  if (durationDays >= 30 && price30Days) {
    // For durations close to 30 days, use the 30-day price
    if (durationDays <= 31) {
      return { baseAmount: price30Days };
    }
    const fullMonths = Math.floor(durationDays / 30);
    const remainingDays = durationDays % 30;
    const remainingHours = remainingDays * 24;
    const remainingAmount = calculateRentalPrice(
      new Date(start.getTime() + fullMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      startTime,
      endDate,
      endTime,
      vehicle
    ).baseAmount;
    return { baseAmount: (fullMonths * price30Days) + remainingAmount };
  }

  // If duration is 15 days or more and 15-day price is set
  if (durationDays >= 15 && price15Days) {
    // For durations close to 15 days, use the 15-day price
    if (durationDays <= 16) {
      return { baseAmount: price15Days };
    }
    const full15Days = Math.floor(durationDays / 15);
    const remainingDays = durationDays % 15;
    const remainingHours = remainingDays * 24;
    const remainingAmount = calculateRentalPrice(
      new Date(start.getTime() + full15Days * 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      startTime,
      endDate,
      endTime,
      vehicle
    ).baseAmount;
    return { baseAmount: (full15Days * price15Days) + remainingAmount };
  }

  // If duration is 7 days or more and 7-day price is set
  if (durationDays >= 7 && price7Days) {
    // For durations close to 7 days, use the 7-day price
    if (durationDays <= 8) {
      return { baseAmount: price7Days };
    }
    const fullWeeks = Math.floor(durationDays / 7);
    const remainingDays = durationDays % 7;
    const remainingHours = remainingDays * 24;
    const remainingAmount = calculateRentalPrice(
      new Date(start.getTime() + fullWeeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      startTime,
      endDate,
      endTime,
      vehicle
    ).baseAmount;
    return { baseAmount: (fullWeeks * price7Days) + remainingAmount };
  }

  // Handle weekend and weekday pricing for shorter durations
  if (isWeekend) {
    // Weekend bookings always charge for 24 hours minimum
    return { baseAmount: Math.max(24, durationHours) * hourlyRate };
  } else {
    // Weekday bookings
    if (durationHours <= 12) {
      // For durations up to 12 hours, charge for full 12 hours
      return { baseAmount: 12 * hourlyRate };
    } else {
      // For durations over 12 hours, charge for actual hours
      return { baseAmount: durationHours * hourlyRate };
    }
  }
};

// Add helper function to format date for display
const formatDateForDisplay = (date: string) => {
  if (!date) return '';
  return format(new Date(date), 'dd/MM/yyyy');
};

// Add helper function to format time for display
const formatTimeForDisplay = (time: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

// Add helper function to format time in 12-hour format
const formatTimeFor12Hour = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

// Add helper function to parse displayed time back to 24h format
const parseTimeToISO = (time12h: string): string => {
  if (!time12h) return '';
  const [time, period] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  let hour = parseInt(hours, 10);
  
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
};

// Update generateTimeOptions to filter out past times
const generateTimeOptions = (selectedDate: string) => {
  const options = [];
  const now = new Date();
  const selectedDateTime = selectedDate ? new Date(selectedDate) : null;
  const isToday = selectedDateTime?.toDateString() === now.toDateString();

  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Skip past times if it's today
      if (isToday) {
        const timeDate = new Date(selectedDateTime!.setHours(hour, minute));
        if (timeDate < now) continue;
      }

      options.push({
        value: time,
        label: formatTimeFor12Hour(time)
      });
    }
  }
  return options;
};

// Add helper function to format duration
const formatDuration = (hours: number): string => {
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days} day${days === 1 ? '' : 's'}${remainingHours ? ` ${remainingHours} hour${remainingHours === 1 ? '' : 's'}` : ''}`;
};

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
  bookingLocation: '',
  useVehicleLocation: true,
  registration_number: '',
  termsAgreed: [false, false, false, false, false]
};

  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Validation functions
  const validatePhoneNumber = (phone: string): boolean => {
    // Indian phone number format: 10 digits, optionally starting with +91
    const phoneRegex = /^(?:\+91)?[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  };

  const validateAadhaar = (aadhaar: string): boolean => {
    // Aadhaar format: 12 digits
    const aadhaarRegex = /^\d{12}$/;
    return aadhaarRegex.test(aadhaar.replace(/\s+/g, ''));
  };

  const validateEmergencyContacts = (formData: FormData): boolean => {
    // Check if emergency contacts are different from customer's phone
    const contacts = [
      formData.emergencyContact1,
      formData.emergencyContact2,
      formData.fatherPhone,
      formData.motherPhone
    ].filter(contact => contact.length > 0);

    // Check if all provided contacts are valid phone numbers
    const areValidNumbers = contacts.every(contact => validatePhoneNumber(contact));
    if (!areValidNumbers) return false;

    // Check if emergency contacts are different from each other
    const uniqueContacts = new Set(contacts.map(contact => contact.replace(/\s+/g, '')));
    if (uniqueContacts.size !== contacts.length) return false;

    // Check if emergency contacts are different from customer's phone
    if (formData.customerPhone && contacts.some(contact => 
      contact.replace(/\s+/g, '') === formData.customerPhone.replace(/\s+/g, '')
    )) {
      return false;
    }

    return true;
  };

  // Add helper function to calculate max DOB
  const calculateMaxDOB = () => {
    const today = new Date();
    const minAge = 19;
    today.setFullYear(today.getFullYear() - minAge);
    return today.toISOString().split('T')[0];
  };

  // Add validation function
  const validateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  // Add helper function to calculate hours between two dates
  const calculateHours = (startDate: string, startTime: string, endDate: string, endTime: string): number => {
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    return Math.ceil(hours); // Round up to nearest hour
  };

  // Add function to validate date and time selection
  const validateDateTime = (startDate: string, startTime: string, endDate: string, endTime: string): boolean => {
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    const now = new Date();

    // Ensure start date is not in the past
    if (start < now) {
      toast.error('Start date and time cannot be in the past');
      return false;
    }

    // Ensure end date is after start date
    if (end <= start) {
      toast.error('End date and time must be after start date and time');
      return false;
    }

    // Minimum booking duration (e.g., 4 hours)
    const minHours = 4;
    const hours = calculateHours(startDate, startTime, endDate, endTime);
    if (hours < minHours) {
      toast.error(`Minimum booking duration is ${minHours} hours`);
      return false;
    }

    return true;
  };

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

  // Update handleInputChange to handle select elements
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    let shouldUpdate = true;
    let updatedFormData = { ...formData, [name]: value };

    // Phone number validation
    if (name === 'customerPhone' || name === 'fatherPhone' || 
        name === 'motherPhone' || name === 'emergencyContact1' || 
        name === 'emergencyContact2') {
      if (value && !validatePhoneNumber(value)) {
        toast.error('Please enter a valid Indian phone number');
        shouldUpdate = false;
      }
    }

    // Aadhaar validation
    if (name === 'customerAadhaar') {
      if (value && !validateAadhaar(value)) {
        toast.error('Please enter a valid 12-digit Aadhaar number');
        shouldUpdate = false;
      }
    }

    // Validate emergency contacts
    if (['emergencyContact1', 'emergencyContact2', 'fatherPhone', 'motherPhone'].includes(name)) {
      const hasEmergencyContacts = updatedFormData.emergencyContact1 || 
                                  updatedFormData.emergencyContact2 || 
                                  updatedFormData.fatherPhone || 
                                  updatedFormData.motherPhone;
      
      if (hasEmergencyContacts && !validateEmergencyContacts(updatedFormData)) {
        toast.error('Emergency contacts must be different from each other and customer\'s phone');
        shouldUpdate = false;
      }
    }

    // Age validation
    if (name === 'customerDob') {
      const age = validateAge(value);
      if (age < 19) {
        toast.error('Renter must be at least 19 years old');
        shouldUpdate = false;
      }
    }

    // Calculate pricing when date/time fields are updated
    if (['startDate', 'startTime', 'endDate', 'endTime'].includes(name) && selectedVehicle) {
      const { startDate, startTime, endDate, endTime } = updatedFormData;
      
      // Only calculate if all date/time fields are filled
      if (startDate && startTime && endDate && endTime) {
        if (validateDateTime(startDate, startTime, endDate, endTime)) {
          const { baseAmount } = calculateRentalPrice(
            startDate,
            startTime,
            endDate,
            endTime,
            selectedVehicle
          );
          
          updatedFormData = {
            ...updatedFormData,
            baseRate: baseAmount,
            totalAmount: baseAmount + Number(updatedFormData.securityDeposit || 0)
          };
        } else {
          shouldUpdate = false;
        }
      }
    }

    if (shouldUpdate) {
      setFormData(updatedFormData);
    }
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

  // Update the handleVehicleSelect function with correct price calculation
  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      setSelectedVehicle(vehicle);
      
      // Update form with vehicle ID and recalculate price if dates are selected
      const updatedFormData = { 
        ...formData, 
        vehicleId,
        registration_number: vehicle.registration_number || ''
      };
      
      if (updatedFormData.startDate && updatedFormData.startTime && 
          updatedFormData.endDate && updatedFormData.endTime) {
        if (validateDateTime(
          updatedFormData.startDate, 
          updatedFormData.startTime, 
          updatedFormData.endDate, 
          updatedFormData.endTime
        )) {
          const { baseAmount } = calculateRentalPrice(
            updatedFormData.startDate, 
            updatedFormData.startTime, 
            updatedFormData.endDate, 
            updatedFormData.endTime,
            vehicle
          );
          
          updatedFormData.baseRate = baseAmount;
          updatedFormData.totalAmount = baseAmount + Number(updatedFormData.securityDeposit || 0);
        }
      }
      
      setFormData(updatedFormData);
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
      toast.error('Please fill all required fields');
      return;
    }
    
    // Validate signature
    if (!signatureData) {
      toast.error('Please add a digital signature');
      return;
    }
    
    // Validate terms agreement
    if (!formData.termsAgreed.every(Boolean)) {
      toast.error('Please agree to all terms and conditions');
      return;
    }
    
    // Add signature validation if it's a required section
    if (expandedSections.documents && !signatureData) {
      toast.error('Please have the customer sign before proceeding');
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
        signature: signatureData,
        bookingLocation: formData.bookingLocation,
        securityDeposit: formData.securityDeposit
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
      
      toast.success('Offline booking created successfully');
      
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create booking');
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
                    <Label htmlFor="customerDob" className="text-sm">Date of Birth * (Must be 19 or older)</Label>
                    <Input 
                      id="customerDob" 
                      name="customerDob" 
                      type="date" 
                      value={formData.customerDob} 
                      onChange={handleInputChange} 
                      max={calculateMaxDOB()}
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

          {/* Vehicle & Rental Details */}
          <Card className="rounded-lg overflow-hidden">
            <CardContent className="pt-6 pb-4">
              <button 
                type="button"
                className="flex justify-between items-center w-full text-left mb-4" 
                onClick={() => toggleSection('vehiclePricing')}
              >
                <h3 className="text-lg font-medium">Vehicle & Rental Details</h3>
                {expandedSections.vehiclePricing ? 
                  <ChevronUp className="h-5 w-5" /> : 
                  <ChevronDown className="h-5 w-5" />
                }
              </button>
              
              {expandedSections.vehiclePricing && (
                <div className="space-y-6 mt-4">
                  {/* Vehicle Selection */}
                  <div className="space-y-4">
                    <Label htmlFor="vehicleId" className="text-sm font-medium">Select Vehicle *</Label>
                    <Select
                      value={formData.vehicleId}
                      onValueChange={handleVehicleSelect}
                    >
                      <SelectTrigger className="h-12 rounded-lg">
                        <SelectValue placeholder="Select a vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.name} - ₹{vehicle.price_per_hour}/hr
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedVehicle && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="registration_number" className="text-sm font-medium">Registration Number *</Label>
                        <Input
                          id="registration_number"
                          name="registration_number"
                          type="text"
                          placeholder="Enter vehicle registration number"
                          value={formData.registration_number || ''}
                          onChange={handleInputChange}
                          required
                          className="h-12 rounded-lg"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Select Pickup Location *</Label>
                        <div className="flex gap-4">
                          {LOCATIONS.map((location) => (
                            <div
                              key={location}
                              className={`flex-1 p-4 rounded-lg border ${
                                formData.bookingLocation === location 
                                ? 'border-primary bg-primary/5' 
                                : 'bg-white hover:bg-gray-50'
                              } cursor-pointer transition-colors`}
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                bookingLocation: location
                              }))}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  id={`location-${location}`}
                                  name="bookingLocation"
                                  className="w-4 h-4"
                                  checked={formData.bookingLocation === location}
                                  onChange={() => setFormData(prev => ({
                                    ...prev,
                                    bookingLocation: location
                                  }))}
                                />
                                <Label 
                                  htmlFor={`location-${location}`} 
                                  className={`text-sm cursor-pointer font-medium ${
                                    formData.bookingLocation === location 
                                    ? 'text-primary' 
                                    : 'text-gray-700'
                                  }`}
                                >
                                  {location}
                                </Label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Date and Time Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="startDate" className="text-sm font-medium">Start Date *</Label>
                          <div className="relative">
                            <Input
                              id="startDate"
                              name="startDate"
                              type="date"
                              min={new Date().toISOString().split('T')[0]}
                              value={formData.startDate}
                              onChange={handleInputChange}
                              required
                              className="h-12 rounded-lg appearance-none w-full"
                              style={{ colorScheme: 'normal' }}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="startTime" className="text-sm font-medium">Start Time *</Label>
                          <div className="relative">
                            <select
                              id="startTime"
                              name="startTime"
                              value={formData.startTime}
                              onChange={handleInputChange}
                              required
                              className="h-12 rounded-lg w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                              <option value="">Select time</option>
                              {generateTimeOptions(formData.startDate).map(({ value, label }) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endDate" className="text-sm font-medium">End Date *</Label>
                          <div className="relative">
                            <Input
                              id="endDate"
                              name="endDate"
                              type="date"
                              min={formData.startDate || new Date().toISOString().split('T')[0]}
                              value={formData.endDate}
                              onChange={handleInputChange}
                              required
                              className="h-12 rounded-lg appearance-none w-full"
                              style={{ colorScheme: 'normal' }}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endTime" className="text-sm font-medium">End Time *</Label>
                          <div className="relative">
                            <select
                              id="endTime"
                              name="endTime"
                              value={formData.endTime}
                              onChange={handleInputChange}
                              required
                              className="h-12 rounded-lg w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                              <option value="">Select time</option>
                              {generateTimeOptions(formData.endDate).map(({ value, label }) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="securityDeposit" className="text-sm font-medium">Security Deposit (₹) *</Label>
                        <Input
                          id="securityDeposit"
                          name="securityDeposit"
                          type="number"
                          min="0"
                          step="100"
                          value={formData.securityDeposit}
                          onChange={handleInputChange}
                          required
                          className="h-12 rounded-lg"
                          placeholder="Enter security deposit amount"
                        />
                      </div>

                      {/* Price Breakdown */}
                      <div className="p-6 bg-gray-50 rounded-lg space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Duration</span>
                          <span className="font-medium">
                            {formatDuration(calculateHours(formData.startDate, formData.startTime, formData.endDate, formData.endTime))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Rental Amount</span>
                          <span className="font-medium">₹{formData.baseRate}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Security Deposit</span>
                          <span className="font-medium">₹{formData.securityDeposit}</span>
                        </div>
                        <div className="flex justify-between items-center font-semibold">
                          <span>Total Amount</span>
                          <span>₹{formData.baseRate + Number(formData.securityDeposit || 0)}</span>
                        </div>
                      </div>
                    </>
                  )}
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