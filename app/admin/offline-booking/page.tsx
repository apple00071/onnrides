'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, addHours, isBefore, isAfter, startOfToday, parse } from 'date-fns';
import Link from 'next/link';
import { 
  Upload, 
  ArrowLeft, 
  User, 
  Calendar as CalendarIcon, 
  Bike, 
  FileText, 
  CreditCard, 
  ShieldCheck, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  MapPin, 
  Mail, 
  Phone, 
  AlertTriangle,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '@/lib/utils/image-compression';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  location: string | null;
  price_per_hour: number;
}

interface FilePreview {
  dlScan: string | null;
  aadharScan: string | null;
  selfie: string | null;
}

export default function OfflineBookingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [activeStep, setActiveStep] = useState(1);
  const [fileUploads, setFileUploads] = useState({
    dlScan: null as File | null,
    aadharScan: null as File | null,
    selfie: null as File | null,
  });
  const [filePreviews, setFilePreviews] = useState<FilePreview>({
    dlScan: null,
    aadharScan: null,
    selfie: null,
  });
  const [isReturningCustomer, setIsReturningCustomer] = useState(false);
  const [reusingDocs, setReusingDocs] = useState({
    dlScan: false,
    aadharScan: false,
    selfie: false,
  });
  const [existingDocUrls, setExistingDocUrls] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    customerName: '',
    phoneNumber: '',
    email: '',
    alternatePhone: '',
    aadharNumber: '',
    fatherNumber: '',
    motherNumber: '',
    dateOfBirth: '',
    dlNumber: '',
    dlExpiryDate: '',
    permanentAddress: '',
    vehicleId: '',
    registrationNumber: '',
    rentalAmount: '',
    securityDepositAmount: '',
    totalAmount: '',
    paidAmount: '',
    pendingAmount: '',
    paymentMethod: '',
    paymentStatus: '',
    paymentReference: '',
    pickupLocation: '',
    termsAccepted: false,
  });

  // Validate Aadhar number
  const validateAadhar = (aadhar: string) => {
    const cleanAadhar = aadhar.replace(/\s/g, '');
    return /^\d{12}$/.test(cleanAadhar);
  };

  // Format Aadhar number with spaces
  const formatAadhar = (aadhar: string) => {
    const cleanAadhar = aadhar.replace(/\s/g, '');
    return cleanAadhar.replace(/(\d{4})/g, '$1 ').trim();
  };

  // Handle Aadhar input
  const handleAadharChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Keep only digits
    if (value.length <= 12) {
      const formattedValue = formatAadhar(value);
      setFormData(prev => ({ ...prev, aadharNumber: formattedValue }));
    }
  };

  // Handle 10-digit phone input
  const handlePhoneChange = async (field: string, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, [field]: cleaned }));

    // Trigger lookup if it's the main phone number and reached 10 digits
    if (field === 'phoneNumber' && cleaned.length === 10) {
      try {
        const response = await fetch(`/api/admin/customers/lookup?phone=${cleaned}`);
        const result = await response.json();

        if (result.success && result.data) {
          const customer = result.data;
          setIsReturningCustomer(true);

          // Auto-fill form
          setFormData(prev => ({
            ...prev,
            customerName: customer.name || prev.customerName,
            email: customer.email || prev.email,
            alternatePhone: customer.alternate_phone || prev.alternatePhone,
            aadharNumber: customer.aadhar_number || prev.aadharNumber,
            fatherNumber: customer.father_number || prev.fatherNumber,
            motherNumber: customer.mother_number || prev.motherNumber,
            dateOfBirth: customer.date_of_birth ? format(new Date(customer.date_of_birth), 'yyyy-MM-dd') : prev.dateOfBirth,
            dlNumber: customer.dl_number || prev.dlNumber,
            dlExpiryDate: customer.dl_expiry_date ? format(new Date(customer.dl_expiry_date), 'yyyy-MM-dd') : prev.dlExpiryDate,
            permanentAddress: customer.address || prev.permanentAddress,
          }));

          // Handle documents
          const docs: Record<string, string> = {};
          if (customer.dl_scan) docs.dlScan = customer.dl_scan;
          if (customer.aadhar_scan) docs.aadharScan = customer.aadhar_scan;
          if (customer.selfie) docs.selfie = customer.selfie;

          // If user profile has documents, prioritize them
          if (customer.profile_documents) {
            if (customer.profile_documents.dl_front) docs.dlScan = customer.profile_documents.dl_front;
            if (customer.profile_documents.aadhaar_front) docs.aadharScan = customer.profile_documents.aadhaar_front;
            if (customer.profile_documents.customer_photo) docs.selfie = customer.profile_documents.customer_photo;
          }

          setExistingDocUrls(docs);
          setReusingDocs({
            dlScan: !!docs.dlScan,
            aadharScan: !!docs.aadharScan,
            selfie: !!docs.selfie,
          });

          // Set previews for existing docs
          setFilePreviews(prev => ({
            ...prev,
            dlScan: docs.dlScan || prev.dlScan,
            aadharScan: docs.aadharScan || prev.aadharScan,
            selfie: docs.selfie || prev.selfie,
          }));

          toast.success('Returning customer found! Details auto-filled.');
        } else {
          setIsReturningCustomer(false);
          setExistingDocUrls({});
          setReusingDocs({ dlScan: false, aadharScan: false, selfie: false });
        }
      } catch (error) {
        console.error('Lookup failed:', error);
      }
    }
  };

  // Calculate total and pending amounts
  const calculateAmounts = (rental: string, deposit: string, paid: string) => {
    const rentalAmount = parseFloat(rental) || 0;
    const depositAmount = parseFloat(deposit) || 0;
    const paidAmount = parseFloat(paid) || 0;

    const total = rentalAmount + depositAmount;
    const pending = total - paidAmount;

    setFormData(prev => ({
      ...prev,
      totalAmount: total.toString(),
      pendingAmount: pending.toString(),
      paymentStatus: paidAmount >= total ? 'paid' : paidAmount > 0 ? 'partially_paid' : 'pending'
    }));
  };

  // Handle amount changes
  const handleAmountChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    calculateAmounts(
      field === 'rentalAmount' ? value : formData.rentalAmount,
      field === 'securityDepositAmount' ? value : formData.securityDepositAmount,
      field === 'paidAmount' ? value : formData.paidAmount
    );
  };

  // Convert 24h time to 12h format for display
  const to12Hour = (time24: string) => {
    if (!time24) return '';
    try {
      const [hours, minutes] = time24.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12;
      return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (error) {
      return '';
    }
  };

  // Handle start time change and auto-calculate end time
  const handleStartTimeChange = (date: string, time: string) => {
    setStartDate(date);
    setStartTime(time);

    if (date && time) {
      try {
        const [hours, minutes] = time.split(':').map(Number);
        const startDateTime = new Date(date);
        startDateTime.setHours(hours, minutes);
        const endDateTime = addHours(startDateTime, 24);

        setEndDate(format(endDateTime, 'yyyy-MM-dd'));
        setEndTime(format(endDateTime, 'HH:mm'));
      } catch (error) {
        console.error('Error calculating end time:', error);
      }
    }
  };

  const getTimeOptions = (isPickup: boolean) => {
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    const selectedDateStr = isPickup ? startDate : endDate;
    if (!selectedDateStr) return [];

    const selectedDate = new Date(selectedDateStr);
    const todayIST = new Date(istTime);
    todayIST.setHours(0, 0, 0, 0);
    const compareDate = new Date(selectedDate);
    compareDate.setHours(0, 0, 0, 0);

    const isToday = compareDate.getTime() === todayIST.getTime();

    let startHour = 0;
    let startMinute = 0;
    if (isToday) {
      const currentHour = istTime.getHours();
      const currentMinutes = istTime.getMinutes();
      const totalMinutes = (currentHour * 60) + currentMinutes;
      const nextSlotInMinutes = (Math.floor(totalMinutes / 30) + 1) * 30;
      startHour = Math.floor(nextSlotInMinutes / 60);
      startMinute = nextSlotInMinutes % 60;
      if (startHour >= 24) return [];
    }

    const options = [];
    for (let i = startHour * 2 + (startMinute === 30 ? 1 : 0); i < 48; i++) {
      const h = Math.floor(i / 2);
      const m = (i % 2) * 30;

      if (!isPickup && startDate && compareDate.toDateString() === new Date(startDate).toDateString() && startTime) {
        const [pickupHour, pickupMin] = startTime.split(':').map(Number);
        if (h * 60 + m <= pickupHour * 60 + pickupMin) continue;
      }

      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const period = h >= 12 ? 'PM' : 'AM';
      const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const label = `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
      options.push({ value, label });
    }
    return options;
  };

  // Fetch available vehicles
  useEffect(() => {
    const fetchAvailableVehicles = async () => {
      if (!startDate || !startTime || !endDate || !endTime || !formData.pickupLocation) {
        setVehicles([]);
        return;
      }

      try {
        const startDateTime = `${startDate}T${startTime}:00`;
        const endDateTime = `${endDate}T${endTime}:00`;

        const response = await fetch('/api/admin/vehicles/available', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDateTime,
            endDateTime,
            location: formData.pickupLocation
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setVehicles(data.vehicles);
        } else {
          console.error('Failed to fetch vehicles:', await response.text());
        }
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      }
    };

    fetchAvailableVehicles();
  }, [startDate, startTime, endDate, endTime, formData.pickupLocation]);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Compress image before storage
        const compressedFile = await compressImage(file, {
          maxWidthOrHeight: 1280,
          initialQuality: 0.7
        });

        // Update file upload state
        setFileUploads(prev => ({
          ...prev,
          [field]: compressedFile
        }));

        // Create preview URL
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreviews(prev => ({
            ...prev,
            [field]: reader.result as string
          }));
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error('Compression error:', error);
        toast.error('Failed to process image');
      }
    }
  };

  // Validate the form
  const validateForm = () => {
    let isValid = true;
    const newFormData = { ...formData };

    if (!newFormData.customerName) {
      newFormData.customerName = 'N/A'; // Default if empty
    }
    if (!newFormData.phoneNumber) {
      newFormData.phoneNumber = 'N/A'; // Default if empty
    }
    if (!newFormData.aadharNumber) {
      alert('Aadhar Number is required.');
      isValid = false;
    } else if (!validateAadhar(newFormData.aadharNumber)) {
      alert('Please enter a valid 12-digit Aadhar number.');
      isValid = false;
    }
    if (!newFormData.dlNumber) {
      alert('DL Number is required.');
      isValid = false;
    }
    if (!newFormData.permanentAddress) {
      alert('Permanent Address is required.');
      isValid = false;
    }
    if (!newFormData.pickupLocation) {
      alert('Please select a pickup location.');
      isValid = false;
    }
    if (!newFormData.vehicleId) {
      alert('Please select a vehicle.');
      isValid = false;
    }
    if (!newFormData.registrationNumber) {
      alert('Registration Number is required.');
      isValid = false;
    }
    if (!newFormData.rentalAmount) {
      alert('Rental Amount is required.');
      isValid = false;
    }
    if (!newFormData.securityDepositAmount) {
      alert('Security Deposit Amount is required.');
      isValid = false;
    }
    if (!newFormData.paidAmount) {
      alert('Paid Amount is required.');
      isValid = false;
    }
    if (!newFormData.paymentMethod) {
      alert('Payment Method is required.');
      isValid = false;
    }
    if (!newFormData.termsAccepted) {
      alert('You must accept the terms and conditions.');
      isValid = false;
    }

    setFormData(newFormData);
    return isValid;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Validate required file uploads (accounting for reused docs)
    if ((!fileUploads.dlScan && !reusingDocs.dlScan) ||
      (!fileUploads.aadharScan && !reusingDocs.aadharScan) ||
      (!fileUploads.selfie && !reusingDocs.selfie)) {
      alert('Please upload all required documents (DL Scan, Aadhar Scan, and Selfie)');
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();

      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formDataToSend.append(key, value.toString());
        }
      });

      // Add dates and times
      formDataToSend.append('startDateTime', `${startDate}T${startTime}:00`);
      formDataToSend.append('endDateTime', `${endDate}T${endTime}:00`);

      // Add files with proper field names (only if not reusing)
      if (fileUploads.dlScan && !reusingDocs.dlScan) {
        formDataToSend.append('dlScan', fileUploads.dlScan);
      } else if (reusingDocs.dlScan && existingDocUrls.dlScan) {
        formDataToSend.append('dlScanUrl', existingDocUrls.dlScan);
      }

      if (fileUploads.aadharScan && !reusingDocs.aadharScan) {
        formDataToSend.append('aadharScan', fileUploads.aadharScan);
      } else if (reusingDocs.aadharScan && existingDocUrls.aadharScan) {
        formDataToSend.append('aadharScanUrl', existingDocUrls.aadharScan);
      }

      if (fileUploads.selfie && !reusingDocs.selfie) {
        formDataToSend.append('selfie', fileUploads.selfie);
      } else if (reusingDocs.selfie && existingDocUrls.selfie) {
        formDataToSend.append('selfieUrl', existingDocUrls.selfie);
      }

      const response = await fetch('/api/admin/bookings/offline', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create booking: ${errorText}`);
      }

      toast.success('Offline booking created successfully!');
      router.push('/admin/bookings');
    } catch (error) {
      console.error('Failed to create booking:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper check status functions
  const isStep1Complete = () => {
    return !!(formData.customerName && formData.phoneNumber && formData.aadharNumber && validateAadhar(formData.aadharNumber) && formData.dlNumber && formData.permanentAddress);
  };
  const isStep2Complete = () => {
    return !!(formData.pickupLocation && startDate && startTime && endDate && endTime && formData.vehicleId && formData.registrationNumber);
  };
  const isStep3Complete = () => {
    return !!((fileUploads.dlScan || reusingDocs.dlScan) && (fileUploads.aadharScan || reusingDocs.aadharScan) && (fileUploads.selfie || reusingDocs.selfie));
  };
  const isStep4Complete = () => {
    return !!(formData.rentalAmount && formData.securityDepositAmount && formData.paidAmount && formData.paymentMethod && formData.termsAccepted);
  };

  const getDurationString = () => {
    if (!startDate || !startTime || !endDate || !endTime) return '';
    try {
      const startDateTime = new Date(`${startDate}T${startTime}:00`);
      const endDateTime = new Date(`${endDate}T${endTime}:00`);
      const diffMs = endDateTime.getTime() - startDateTime.getTime();
      if (isNaN(diffMs) || diffMs <= 0) return '';
      
      const totalHours = diffMs / (1000 * 60 * 60);
      const days = Math.floor(totalHours / 24);
      const hours = Math.round(totalHours % 24);
      
      let durationStr = '';
      if (days > 0) {
        durationStr += `${days} ${days === 1 ? 'Day' : 'Days'}`;
      }
      if (hours > 0) {
        if (durationStr) durationStr += ' ';
        durationStr += `${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
      }
      return durationStr || `${totalHours} Hours`;
    } catch {
      return '';
    }
  };

  const nextStep = () => {
    if (activeStep < 4) setActiveStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (activeStep > 1) setActiveStep(prev => prev - 1);
  };

  return (
    <div className="py-1 w-full px-2 sm:px-4">
      {/* Header breadcrumb */}
      <div className="mb-6">
        <Link
          href="/admin/bookings"
          className="text-[#f26e24] hover:text-[#e05d13] flex items-center gap-2 font-bold text-xs md:text-sm tracking-tight transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Bookings</span>
        </Link>
      </div>

      {/* Main Content Layout Grid */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        {/* Left Column: Form Content */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* STEP 1: CUSTOMER INFORMATION */}
            {activeStep === 1 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6 transition-all duration-300">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <User className="h-5.5 w-5.5 text-[#f26e24]" />
                    <span>Customer Profile</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">Enter customer credentials. 10-digit phone will check for returning customer profiles.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => handlePhoneChange('phoneNumber', e.target.value)}
                        placeholder="10-digit number"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24]/20 focus:border-[#f26e24] text-sm transition-all duration-200"
                        required
                      />
                    </div>
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                      placeholder="Full Name"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24]/20 focus:border-[#f26e24] text-sm transition-all duration-200"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="email@example.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24]/20 focus:border-[#f26e24] text-sm transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Alternate Phone */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Alternate Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.alternatePhone}
                      onChange={(e) => handlePhoneChange('alternatePhone', e.target.value)}
                      placeholder="Secondary phone"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24]/20 focus:border-[#f26e24] text-sm transition-all duration-200"
                    />
                  </div>

                  {/* Aadhar Number */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Aadhar Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.aadharNumber}
                      onChange={handleAadharChange}
                      placeholder="XXXX XXXX XXXX"
                      maxLength={14}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24]/20 focus:border-[#f26e24] text-sm transition-all duration-200"
                      required
                    />
                  </div>

                  {/* DL Number */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      DL Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.dlNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, dlNumber: e.target.value.toUpperCase() }))}
                      placeholder="Driving License Number"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24]/20 focus:border-[#f26e24] text-sm transition-all duration-200"
                      required
                    />
                  </div>

                  {/* Father's Number */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Father's Number
                    </label>
                    <input
                      type="tel"
                      value={formData.fatherNumber}
                      onChange={(e) => handlePhoneChange('fatherNumber', e.target.value)}
                      placeholder="Father's phone"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24]/20 focus:border-[#f26e24] text-sm transition-all duration-200"
                    />
                  </div>

                  {/* Mother's Number */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Mother's Number
                    </label>
                    <input
                      type="tel"
                      value={formData.motherNumber}
                      onChange={(e) => handlePhoneChange('motherNumber', e.target.value)}
                      placeholder="Mother's phone"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24]/20 focus:border-[#f26e24] text-sm transition-all duration-200"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Date of Birth
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-[42px] rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-100/50 text-gray-800 hover:text-gray-900 transition-colors",
                            !formData.dateOfBirth && "text-gray-400"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate whitespace-nowrap">
                            {formData.dateOfBirth ? format(new Date(formData.dateOfBirth), "dd MMM yyyy") : "Pick Date of Birth"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined}
                          onSelect={(date) => {
                            setFormData(prev => ({
                              ...prev,
                              dateOfBirth: date ? format(date, 'yyyy-MM-dd') : ''
                            }));
                          }}
                          disabled={(date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* DL Expiry Date */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      DL Expiry Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-[42px] rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-100/50 text-gray-800 hover:text-gray-900 transition-colors",
                            !formData.dlExpiryDate && "text-gray-400"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate whitespace-nowrap">
                            {formData.dlExpiryDate ? format(new Date(formData.dlExpiryDate), "dd MMM yyyy") : "Pick DL Expiry Date"}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.dlExpiryDate ? new Date(formData.dlExpiryDate) : undefined}
                          onSelect={(date) => {
                            setFormData(prev => ({
                              ...prev,
                              dlExpiryDate: date ? format(date, 'yyyy-MM-dd') : ''
                            }));
                          }}
                          disabled={(date) => date < startOfToday()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Permanent Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.permanentAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, permanentAddress: e.target.value }))}
                      rows={3}
                      placeholder="Complete residential address"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24]/20 focus:border-[#f26e24] text-sm transition-all duration-200 resize-none"
                      required
                    />
                  </div>
                </div>

                {/* Footer steps button */}
                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#f26e24] hover:bg-[#d95e1d] text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-md shadow-orange-100 hover:shadow-lg"
                  >
                    <span>Next: Vehicle & Dates</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: RENTAL & VEHICLE DETAILS */}
            {activeStep === 2 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6 transition-all duration-300">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <CalendarIcon className="h-5.5 w-5.5 text-[#f26e24]" />
                    <span>Rental Details & Vehicle Selection</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">Configure rental schedule and select an available vehicle card.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Location */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Pickup Location <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select
                        value={formData.pickupLocation}
                        onChange={(e) => setFormData(prev => ({ ...prev, pickupLocation: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24]/20 focus:border-[#f26e24] text-sm transition-all duration-200 cursor-pointer appearance-none"
                        required
                      >
                        <option value="">Select Location</option>
                        <option value="Madhapur">Madhapur</option>
                        <option value="Erragadda">Erragadda</option>
                      </select>
                    </div>
                  </div>

                  <div className="hidden sm:block" />

                  {/* Start Date/Time */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Start Date & Time <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "flex-1 justify-start text-left font-normal h-[42px] rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-100/50 text-gray-800 hover:text-gray-900 transition-colors",
                              !startDate && "text-gray-400"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate whitespace-nowrap">
                              {startDate ? format(new Date(startDate), "dd MMM yyyy") : "Pick Start Date"}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate ? new Date(startDate) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                handleStartTimeChange(format(date, 'yyyy-MM-dd'), startTime);
                              } else {
                                handleStartTimeChange('', startTime);
                              }
                            }}
                            disabled={(date) => date < startOfToday()}
                          />
                        </PopoverContent>
                      </Popover>

                      <Select 
                        value={startTime} 
                        onValueChange={(val: string) => handleStartTimeChange(startDate, val)}
                      >
                        <SelectTrigger className="w-32 h-[42px] rounded-xl border border-gray-200 bg-gray-50/50 text-gray-800 hover:bg-gray-100/50">
                          <SelectValue placeholder="Time" />
                        </SelectTrigger>
                        <SelectContent>
                          {getTimeOptions(true).map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* End Date/Time */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      End Date & Time <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "flex-1 justify-start text-left font-normal h-[42px] rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-100/50 text-gray-800 hover:text-gray-900 transition-colors",
                              !endDate && "text-gray-400"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate whitespace-nowrap">
                              {endDate ? format(new Date(endDate), "dd MMM yyyy") : "Pick End Date"}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={endDate ? new Date(endDate) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                setEndDate(format(date, 'yyyy-MM-dd'));
                              } else {
                                setEndDate('');
                              }
                            }}
                            disabled={(date) => {
                              const minDateLimit = startDate ? new Date(startDate) : startOfToday();
                              return date < minDateLimit;
                            }}
                          />
                        </PopoverContent>
                      </Popover>

                      <Select 
                        value={endTime} 
                        onValueChange={(val: string) => setEndTime(val)}
                      >
                        <SelectTrigger className="w-32 h-[42px] rounded-xl border border-gray-200 bg-gray-50/50 text-gray-800 hover:bg-gray-100/50">
                          <SelectValue placeholder="Time" />
                        </SelectTrigger>
                        <SelectContent>
                          {getTimeOptions(false).map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Vehicle Selection Grid */}
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                    Available Vehicles <span className="text-red-500">*</span>
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[340px] overflow-y-auto pr-2 pb-2">
                    {vehicles.map((vehicle) => {
                      const isSelected = formData.vehicleId === vehicle.id;
                      return (
                        <div
                          key={vehicle.id}
                          onClick={() => setFormData(prev => ({ ...prev, vehicleId: vehicle.id }))}
                          className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 select-none ${
                            isSelected
                              ? 'border-[#f26e24] bg-orange-50/30 shadow-sm'
                              : 'border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50/30'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                                <Bike className="h-4 w-4 text-[#f26e24]" />
                                <span>{vehicle.name}</span>
                              </h4>
                              <p className="text-[10px] text-gray-500 capitalize mt-0.5">
                                {vehicle.type}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-[#f26e24] bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-lg">
                              ₹{vehicle.price_per_hour}/hr
                            </span>
                          </div>
                          
                          <div className="mt-4 flex justify-between items-center">
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${
                              isSelected ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {isSelected ? 'Selected' : 'Available'}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {vehicles.length === 0 && (
                      <div className="col-span-full py-8 text-center text-gray-500 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                        <Bike className="mx-auto h-8 w-8 text-gray-400 mb-2 animate-bounce" />
                        <p className="text-sm font-medium">No vehicles listed</p>
                        <p className="text-xs text-gray-400 mt-1">Please select Location, Dates, and Times above to search.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Registration Number */}
                <div className="pt-4 border-t border-gray-100">
                  <div className="max-w-xs">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Registration Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, registrationNumber: e.target.value.toUpperCase() }))}
                      placeholder="TS-08-XX-XXXX"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24]/20 focus:border-[#f26e24] text-sm font-mono tracking-wider transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-semibold rounded-xl transition-all duration-200"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#f26e24] hover:bg-[#d95e1d] text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-md shadow-orange-100 hover:shadow-lg"
                  >
                    <span>Next: Documents</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: REQUIRED DOCUMENTS */}
            {activeStep === 3 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6 transition-all duration-300">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="h-5.5 w-5.5 text-[#f26e24]" />
                    <span>Identity Verification Documents</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">Upload scan of Driving License, Aadhaar card, and capture/upload customer selfie.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* DL Scan */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Driving License <span className="text-red-500">*</span>
                    </label>
                    
                    <div className="flex flex-col items-center justify-center w-full">
                      {filePreviews.dlScan ? (
                        <div className="relative w-full h-40 border border-gray-200 rounded-2xl overflow-hidden bg-gray-50 p-2">
                          <img
                            src={filePreviews.dlScan}
                            alt="DL Preview"
                            className="w-full h-full object-contain rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFileUploads(prev => ({ ...prev, dlScan: null }));
                              setFilePreviews(prev => ({ ...prev, dlScan: null }));
                              setReusingDocs(prev => ({ ...prev, dlScan: false }));
                            }}
                            className="absolute top-2 right-2 bg-red-500/90 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center leading-none text-xs hover:bg-red-600 transition-colors"
                          >
                            ×
                          </button>
                          {reusingDocs.dlScan && (
                            <span className="absolute bottom-2 left-2 right-2 bg-green-600/90 text-white text-[10px] py-1 text-center font-bold rounded-lg border border-green-500 tracking-wider">
                              REUSED
                            </span>
                          )}
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-200 border-dashed rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100/50 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                            <Upload className="w-7 h-7 mb-2 text-[#f26e24]" />
                            <p className="text-xs font-semibold text-gray-700">Upload DL Scan</p>
                            <p className="text-[10px] text-gray-400 mt-1">Image or PDF</p>
                          </div>
                          <input
                            type="file"
                            name="dlScan"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'dlScan')}
                            accept="image/*,.pdf" capture="environment"
                            required={!reusingDocs.dlScan}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Aadhar Scan */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Aadhaar Card <span className="text-red-500">*</span>
                    </label>
                    
                    <div className="flex flex-col items-center justify-center w-full">
                      {filePreviews.aadharScan ? (
                        <div className="relative w-full h-40 border border-gray-200 rounded-2xl overflow-hidden bg-gray-50 p-2">
                          <img
                            src={filePreviews.aadharScan}
                            alt="Aadhaar Preview"
                            className="w-full h-full object-contain rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFileUploads(prev => ({ ...prev, aadharScan: null }));
                              setFilePreviews(prev => ({ ...prev, aadharScan: null }));
                              setReusingDocs(prev => ({ ...prev, aadharScan: false }));
                            }}
                            className="absolute top-2 right-2 bg-red-500/90 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center leading-none text-xs hover:bg-red-600 transition-colors"
                          >
                            ×
                          </button>
                          {reusingDocs.aadharScan && (
                            <span className="absolute bottom-2 left-2 right-2 bg-green-600/90 text-white text-[10px] py-1 text-center font-bold rounded-lg border border-green-500 tracking-wider">
                              REUSED
                            </span>
                          )}
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-200 border-dashed rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100/50 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                            <Upload className="w-7 h-7 mb-2 text-[#f26e24]" />
                            <p className="text-xs font-semibold text-gray-700">Upload Aadhaar</p>
                            <p className="text-[10px] text-gray-400 mt-1">Image or PDF</p>
                          </div>
                          <input
                            type="file"
                            name="aadharScan"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'aadharScan')}
                            accept="image/*,.pdf" capture="environment"
                            required={!reusingDocs.aadharScan}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Selfie Photo */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Customer Selfie <span className="text-red-500">*</span>
                    </label>
                    
                    <div className="flex flex-col items-center justify-center w-full">
                      {filePreviews.selfie ? (
                        <div className="relative w-full h-40 border border-gray-200 rounded-2xl overflow-hidden bg-gray-50 p-2">
                          <img
                            src={filePreviews.selfie}
                            alt="Selfie Preview"
                            className="w-full h-full object-contain rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFileUploads(prev => ({ ...prev, selfie: null }));
                              setFilePreviews(prev => ({ ...prev, selfie: null }));
                              setReusingDocs(prev => ({ ...prev, selfie: false }));
                            }}
                            className="absolute top-2 right-2 bg-red-500/90 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center leading-none text-xs hover:bg-red-600 transition-colors"
                          >
                            ×
                          </button>
                          {reusingDocs.selfie && (
                            <span className="absolute bottom-2 left-2 right-2 bg-green-600/90 text-white text-[10px] py-1 text-center font-bold rounded-lg border border-green-500 tracking-wider">
                              REUSED
                            </span>
                          )}
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-200 border-dashed rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100/50 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                            <Upload className="w-7 h-7 mb-2 text-[#f26e24]" />
                            <p className="text-xs font-semibold text-gray-700">Upload Selfie</p>
                            <p className="text-[10px] text-gray-400 mt-1">Camera portrait image</p>
                          </div>
                          <input
                            type="file"
                            name="selfie"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, 'selfie')}
                            accept="image/*" capture="environment"
                            required={!reusingDocs.selfie}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-semibold rounded-xl transition-all duration-200"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#f26e24] hover:bg-[#d95e1d] text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-md shadow-orange-100 hover:shadow-lg"
                  >
                    <span>Next: Settlement</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: PAYMENT SETTLEMENT & TERMS */}
            {activeStep === 4 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6 transition-all duration-300">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <CreditCard className="h-5.5 w-5.5 text-[#f26e24]" />
                    <span>Settlement & Terms Agreement</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">Configure pricing terms and record initial advance payments collected.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Rental Amount */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Rental Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.rentalAmount}
                      onChange={(e) => handleAmountChange('rentalAmount', e.target.value)}
                      placeholder="Rental charge value"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24]/20 focus:border-[#f26e24] text-sm transition-all duration-200"
                      required
                    />
                  </div>

                  {/* Security Deposit */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Security Deposit (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.securityDepositAmount}
                      onChange={(e) => handleAmountChange('securityDepositAmount', e.target.value)}
                      placeholder="Deposit amount"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24]/20 focus:border-[#f26e24] text-sm transition-all duration-200"
                      required
                    />
                  </div>

                  {/* Gross Total (Calculated) */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Gross Total Price (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.totalAmount}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-100 border border-gray-200 text-sm font-semibold text-gray-700"
                      disabled
                    />
                  </div>

                  {/* Paid Amount */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Paid Advance Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.paidAmount}
                      onChange={(e) => handleAmountChange('paidAmount', e.target.value)}
                      placeholder="Amount collected now"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24]/20 focus:border-[#f26e24] text-sm transition-all duration-200"
                      required
                    />
                  </div>

                  {/* Pending Amount (Calculated) */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Pending Amount / Balance Due (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.pendingAmount}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-100 border border-gray-200 text-sm font-semibold text-[#f26e24]"
                      disabled
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Payment Method <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24]/20 focus:border-[#f26e24] text-sm cursor-pointer appearance-none"
                      required
                    >
                      <option value="">Select payment method</option>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>

                  {/* Payment Reference */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Payment Reference ID
                    </label>
                    <input
                      type="text"
                      value={formData.paymentReference}
                      onChange={(e) => setFormData(prev => ({ ...prev, paymentReference: e.target.value }))}
                      placeholder="Transaction hash or reference"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24]/20 focus:border-[#f26e24] text-sm transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="pt-6 border-t border-gray-100 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span>Rider Regulations & Agreement</span>
                  </h3>
                  
                  <div className="bg-gray-50 rounded-xl p-4 text-[11px] text-gray-600 space-y-2 border border-gray-200/50 max-h-40 overflow-y-auto">
                    <p>• The vehicle will have a full tank of fuel, and it should be returned with a full tank.</p>
                    <p>• The vehicle should be returned in the same condition as it was rented.</p>
                    <p>• Any damage to the vehicle will be charged to the customer.</p>
                    <p>• The security deposit will be refunded after the vehicle is returned and inspected.</p>
                    <p>• Late returns will be charged at ₹100/- per hour. Extension requires a call to support.</p>
                    <p>• The customer is responsible for any traffic violations during the rental period.</p>
                    <p>• The customer must have a valid driving license.</p>
                    <p>• The customer must be above 21 years of age.</p>
                    <p>• The customer must provide valid ID proof.</p>
                    <p>• Smoking is not allowed in the vehicle.</p>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="termsAccepted"
                      checked={formData.termsAccepted}
                      onChange={(e) => setFormData(prev => ({ ...prev, termsAccepted: e.target.checked }))}
                      className="h-4.5 w-4.5 text-[#f26e24] focus:ring-[#f26e24] border-gray-300 rounded-lg cursor-pointer"
                      required
                    />
                    <label htmlFor="termsAccepted" className="ml-2 block text-xs font-semibold text-gray-700 cursor-pointer select-none">
                      I verify that the customer has read and agreed to all terms and conditions
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-semibold rounded-xl transition-all duration-200"
                  >
                    Back
                  </button>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="px-6 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-semibold rounded-xl transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2.5 bg-[#f26e24] hover:bg-[#d95e1d] text-white text-sm font-bold rounded-xl transition-all duration-200 shadow-md shadow-orange-100 hover:shadow-lg disabled:opacity-50"
                    >
                      {loading ? 'Creating...' : 'Create Booking'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Live Booking Summary Panel (Invoice Ticket) */}
        <div className="lg:col-span-4 mt-8 lg:mt-0">
          <div className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden sticky top-6">
            <div className="bg-[#f26e24] p-4 text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                <span>Booking Summary</span>
              </h3>
              <p className="text-[10px] text-orange-100">Live details and calculations</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Customer</h4>
                {formData.customerName ? (
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{formData.customerName}</p>
                    <p className="text-xs text-gray-500">{formData.phoneNumber || 'No phone number'}</p>
                    {isReturningCustomer && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                        <CheckCircle2 className="h-3 w-3" /> Returning Customer
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No customer details entered yet</p>
                )}
              </div>

              {/* Selected Vehicle Info */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Vehicle</h4>
                {formData.vehicleId && vehicles.length > 0 && vehicles.find(v => v.id === formData.vehicleId) ? (
                  (() => {
                    const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
                    return (
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900 text-xs">{selectedVehicle?.name}</p>
                          <p className="text-[10px] text-gray-500 capitalize">{selectedVehicle?.type}</p>
                        </div>
                        {formData.registrationNumber && (
                          <span className="text-[10px] font-mono font-bold bg-white px-2.5 py-1 border border-gray-200 rounded-lg text-gray-800 tracking-wider shadow-sm">
                            {formData.registrationNumber}
                          </span>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-xs text-gray-400 italic">No vehicle selected yet</p>
                )}
              </div>

              {/* Rental Schedule Duration */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Duration</h4>
                {startDate && startTime && endDate && endTime ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Pickup:</span>
                      <span className="font-semibold text-gray-800">{format(new Date(startDate), 'dd MMM yyyy')} {to12Hour(startTime)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Return:</span>
                      <span className="font-semibold text-gray-800">{format(new Date(endDate), 'dd MMM yyyy')} {to12Hour(endTime)}</span>
                    </div>
                    {getDurationString() && (
                      <div className="flex justify-between text-xs pt-1.5 border-t border-dashed border-gray-100">
                        <span className="text-gray-500">Total Duration:</span>
                        <span className="font-bold text-[#f26e24]">{getDurationString()}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Enter dates to calculate duration</p>
                )}
              </div>

              {/* Invoice calculation breakdown */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Invoice</h4>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rental Charge:</span>
                    <span className="font-semibold text-gray-800">₹{formData.rentalAmount || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Security Deposit:</span>
                    <span className="font-semibold text-gray-800">₹{formData.securityDepositAmount || '0'}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-100 font-bold text-gray-900">
                    <span>Gross Total:</span>
                    <span>₹{formData.totalAmount || '0'}</span>
                  </div>
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Paid Advance:</span>
                    <span>-₹{formData.paidAmount || '0'}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-double border-gray-200 font-extrabold text-sm text-gray-900">
                    <span>Balance Due:</span>
                    <span className="text-[#f26e24]">₹{formData.pendingAmount || '0'}</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="pt-2">
                  <span className={`w-full text-center py-2 px-4 rounded-xl text-[10px] font-bold inline-block border ${
                    formData.paymentStatus === 'paid'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : formData.paymentStatus === 'partially_paid'
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    PAYMENT STATUS: {
                      formData.paymentStatus === 'paid' 
                        ? 'FULLY PAID' 
                        : formData.paymentStatus === 'partially_paid' 
                          ? 'PARTIALLY PAID' 
                          : 'PENDING'
                    }
                  </span>
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
