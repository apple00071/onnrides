'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, addHours, isBefore, isAfter, startOfToday, parse } from 'date-fns';
import Link from 'next/link';
import { Upload } from 'lucide-react';

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
  const handlePhoneChange = (field: string, value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 10);
    setFormData(prev => ({ ...prev, [field]: cleaned }));
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
      // Update file upload state
      setFileUploads(prev => ({
        ...prev,
        [field]: file
      }));

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreviews(prev => ({
          ...prev,
          [field]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
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

    // Validate required file uploads
    if (!fileUploads.dlScan || !fileUploads.aadharScan || !fileUploads.selfie) {
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

      // Add files with proper field names
      if (fileUploads.dlScan) {
        formDataToSend.append('dlScan', fileUploads.dlScan);
      }
      if (fileUploads.aadharScan) {
        formDataToSend.append('aadharScan', fileUploads.aadharScan);
      }
      if (fileUploads.selfie) {
        formDataToSend.append('selfie', fileUploads.selfie);
      }

      const response = await fetch('/api/admin/bookings/offline', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create booking: ${errorText}`);
      }

      const result = await response.json();
      router.push('/admin/bookings');
    } catch (error) {
      console.error('Failed to create booking:', error);
      alert('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Create Offline Booking</h1>
        <Link
          href="/admin/bookings"
          className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back to Bookings
        </Link>
      </div>

      <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-6">
        {/* Customer Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-medium mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => handlePhoneChange('phoneNumber', e.target.value)}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alternate Phone
              </label>
              <input
                type="tel"
                value={formData.alternatePhone}
                onChange={(e) => handlePhoneChange('alternatePhone', e.target.value)}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aadhar Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.aadharNumber}
                onChange={handleAadharChange}
                placeholder="XXXX XXXX XXXX"
                maxLength={14}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Father's Number
              </label>
              <input
                type="tel"
                value={formData.fatherNumber}
                onChange={(e) => handlePhoneChange('fatherNumber', e.target.value)}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mother's Number
              </label>
              <input
                type="tel"
                value={formData.motherNumber}
                onChange={(e) => handlePhoneChange('motherNumber', e.target.value)}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DL Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.dlNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, dlNumber: e.target.value.toUpperCase() }))}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DL Expiry Date
              </label>
              <input
                type="date"
                value={formData.dlExpiryDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dlExpiryDate: e.target.value }))}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Permanent Address <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.permanentAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, permanentAddress: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                required
              />
            </div>
          </div>
        </div>

        {/* Rental Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-medium mb-4">Rental Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Location <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.pickupLocation}
                onChange={(e) => setFormData(prev => ({ ...prev, pickupLocation: e.target.value }))}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                required
              >
                <option value="">Select Location</option>
                <option value="Madhapur">Madhapur</option>
                <option value="Erragadda">Erragadda</option>
                <option value="Office Location">Office Location</option>
              </select>
            </div>
            <div className="hidden md:block"></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date & Time <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartTimeChange(e.target.value, startTime)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="flex-1 px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                  required
                />
                <select
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(startDate, e.target.value)}
                  className="w-40 px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:border-transparent"
                  required
                >
                  <option value="">Time</option>
                  {getTimeOptions(true).map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date & Time <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || format(new Date(), 'yyyy-MM-dd')}
                  className="flex-1 px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                  required
                />
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-40 px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:border-transparent"
                  required
                >
                  <option value="">Time</option>
                  {getTimeOptions(false).map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>


        {/* Vehicle Details */}
        < div className="bg-white rounded-lg shadow p-6 mt-6" >
          <h2 className="text-xl font-medium mb-4">Vehicle Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Vehicle <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.vehicleId}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleId: e.target.value }))}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                required
              >
                <option value="">Select a vehicle</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} - {vehicle.type} ({vehicle.location || 'No location'}) - ₹{vehicle.price_per_hour}/hr
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                {vehicles.length > 0
                  ? `Available vehicles: ${vehicles.length}`
                  : 'Please select date and time to see available vehicles'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registration Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.registrationNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, registrationNumber: e.target.value.toUpperCase() }))}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                required
              />
            </div>
          </div>
        </div >

        {/* Payment Details */}
        < div className="bg-white rounded-lg shadow p-6" >
          <h2 className="text-xl font-medium mb-4">Payment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rental Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.rentalAmount}
                onChange={(e) => handleAmountChange('rentalAmount', e.target.value)}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Security Deposit Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.securityDepositAmount}
                onChange={(e) => handleAmountChange('securityDepositAmount', e.target.value)}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Amount
              </label>
              <input
                type="number"
                value={formData.totalAmount}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paid Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.paidAmount}
                onChange={(e) => handleAmountChange('paidAmount', e.target.value)}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pending Amount
              </label>
              <input
                type="number"
                value={formData.pendingAmount}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Reference
              </label>
              <input
                type="text"
                value={formData.paymentReference}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentReference: e.target.value }))}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                required
              >
                <option value="">Select payment method</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Status
              </label>
              <input
                type="text"
                value={formData.paymentStatus}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                disabled
              />
            </div>
          </div>
        </div >

        {/* Documents */}
        < div className="bg-white rounded-lg shadow p-6" >
          <h2 className="text-xl font-medium mb-4">Documents</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DL Scan <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col items-center justify-center w-full">
                {filePreviews.dlScan ? (
                  <div className="relative w-full h-32 mb-2">
                    <img
                      src={filePreviews.dlScan}
                      alt="DL Preview"
                      className="w-full h-full object-contain rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setFileUploads(prev => ({ ...prev, dlScan: null }));
                        setFilePreviews(prev => ({ ...prev, dlScan: null }));
                      }}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 m-1"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-500" />
                      <p className="text-sm text-gray-500">Click to upload DL scan</p>
                    </div>
                    <input
                      type="file"
                      name="dlScan"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'dlScan')}
                      accept="image/*,.pdf" capture="environment"
                      required
                    />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aadhar Scan <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col items-center justify-center w-full">
                {filePreviews.aadharScan ? (
                  <div className="relative w-full h-32 mb-2">
                    <img
                      src={filePreviews.aadharScan}
                      alt="Aadhar Preview"
                      className="w-full h-full object-contain rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setFileUploads(prev => ({ ...prev, aadharScan: null }));
                        setFilePreviews(prev => ({ ...prev, aadharScan: null }));
                      }}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 m-1"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-500" />
                      <p className="text-sm text-gray-500">Click to upload Aadhar scan</p>
                    </div>
                    <input
                      type="file"
                      name="aadharScan"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'aadharScan')}
                      accept="image/*,.pdf" capture="environment"
                      required
                    />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selfie <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col items-center justify-center w-full">
                {filePreviews.selfie ? (
                  <div className="relative w-full h-32 mb-2">
                    <img
                      src={filePreviews.selfie}
                      alt="Selfie Preview"
                      className="w-full h-full object-contain rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setFileUploads(prev => ({ ...prev, selfie: null }));
                        setFilePreviews(prev => ({ ...prev, selfie: null }));
                      }}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 m-1"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-500" />
                      <p className="text-sm text-gray-500">Click to upload selfie</p>
                    </div>
                    <input
                      type="file"
                      name="selfie"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'selfie')}
                      accept="image/*" capture="environment"
                      required
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div >

        {/* Terms and Conditions */}
        < div className="bg-white rounded-lg shadow p-6" >
          <h2 className="text-xl font-medium mb-4">Terms and Conditions</h2>
          <div className="space-y-4">
            <div className="text-sm text-gray-600 space-y-2">
              <p>• The vehicle will have a full tank of fuel, and it should be returned with a full tank.</p>
              <p>• The vehicle should be returned in the same condition as it was rented.</p>
              <p>• Any damage to the vehicle will be charged to the customer.</p>
              <p>• The security deposit will be refunded after the vehicle is returned and inspected.</p>
              <p>• Late returns will be charged extra as per the hourly rate.</p>
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
                className="h-4 w-4 text-[#f26e24] focus:ring-[#f26e24] border-gray-300 rounded"
                required
              />
              <label htmlFor="termsAccepted" className="ml-2 block text-sm text-gray-900">
                I accept the terms and conditions
              </label>
            </div>
          </div>
        </div >

        {/* Action Buttons */}
        < div className="flex justify-end gap-4" >
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-[#f26e24] text-white rounded-md hover:bg-[#d95e1d] focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Booking'}
          </button>
        </div >
      </form >
    </div >
  );
} 