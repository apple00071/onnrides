'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';
import { Upload } from 'lucide-react';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  location: string | null;
  price_per_hour: number;
}

export default function OfflineBookingPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [formData, setFormData] = useState({
    // Customer Information
    customerName: '',
    phoneNumber: '',
    email: '',
    alternatePhone: '',
    dlNumber: '',
    dlExpiryDate: '',
    permanentAddress: '',

    // Vehicle Details
    vehicleId: '',
    registrationNumber: '',

    // Rental Details
    purposeOfRent: '',

    // Payment Details
    paymentMethod: '',
    paidAmount: '',
    dueAmount: '',
    paymentStatus: '',
    paymentReference: '',
    securityDepositAmount: '',

    // Documents
    dlScan: null,
    aadharScan: null,
    selfie: null,
    agreementScan: null,

    // Physical Documents Verification
    originalDlVerified: false,
    voterIdVerified: false,

    // Terms and Conditions
    termsAccepted: false,
  });

  // Fetch available vehicles when dates change
  useEffect(() => {
    const fetchAvailableVehicles = async () => {
      if (!startDate || !startTime || !endDate || !endTime) return;
      
      try {
        const response = await fetch('/api/admin/vehicles/available', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDateTime: `${startDate}T${startTime}:00`,
            endDateTime: `${endDate}T${endTime}:00`,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setVehicles(data.vehicles);
        }
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      }
    };

    fetchAvailableVehicles();
  }, [startDate, startTime, endDate, endTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/admin/bookings/offline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          startDateTime: `${startDate}T${startTime}:00`,
          endDateTime: `${endDate}T${endTime}:00`,
        }),
      });

      if (response.ok) {
        router.push('/admin/bookings');
      } else {
        console.error('Failed to create booking');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        [field]: file
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Create Offline Booking</h1>
        <Link 
          href="/admin/bookings"
          className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back to Bookings
        </Link>
      </div>

      <div className="space-y-6">
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
                onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, alternatePhone: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, dlNumber: e.target.value }))}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DL Expiry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.dlExpiryDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dlExpiryDate: e.target.value }))}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Permanent Address <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.permanentAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, permanentAddress: e.target.value }))}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                rows={3}
                required
              />
            </div>
          </div>
        </div>

        {/* Vehicle Details */}
        <div className="bg-white rounded-lg shadow p-6">
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
              <p className="mt-1 text-sm text-gray-500">Available vehicles: {vehicles.length}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registration Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.registrationNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, registrationNumber: e.target.value }))}
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
                Start Date & Time <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                  required
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  step="900"
                  className="w-32 px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                  required
                />
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
                  className="flex-1 px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                  required
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  step="900"
                  className="w-32 px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purpose of Rent
              </label>
              <input
                type="text"
                value={formData.purposeOfRent}
                onChange={(e) => setFormData(prev => ({ ...prev, purposeOfRent: e.target.value }))}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-medium mb-4">Payment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                Paid Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.paidAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, paidAmount: e.target.value }))}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Amount
              </label>
              <input
                type="number"
                value={formData.dueAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, dueAmount: e.target.value }))}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.paymentStatus}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentStatus: e.target.value }))}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                required
              >
                <option value="">Select status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="partially_paid">Partially Paid</option>
              </select>
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
                Security Deposit Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.securityDepositAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, securityDepositAmount: e.target.value }))}
                className="w-full px-4 py-2 rounded-md bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50"
                required
              />
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-medium mb-4">Documents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DL Scan <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-500" />
                    <p className="text-sm text-gray-500">Click to upload DL scan</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'dlScan')}
                    accept="image/*,.pdf"
                    required
                  />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aadhar Scan <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-500" />
                    <p className="text-sm text-gray-500">Click to upload Aadhar scan</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'aadharScan')}
                    accept="image/*,.pdf"
                    required
                  />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Selfie <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-500" />
                    <p className="text-sm text-gray-500">Click to upload selfie</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'selfie')}
                    accept="image/*"
                    required
                  />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agreement Scan
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-500" />
                    <p className="text-sm text-gray-500">Click to upload agreement</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'agreementScan')}
                    accept="image/*,.pdf"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Physical Documents Verification */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-medium mb-4">Physical Documents Verification</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="originalDlVerified"
                checked={formData.originalDlVerified}
                onChange={(e) => setFormData(prev => ({ ...prev, originalDlVerified: e.target.checked }))}
                className="h-4 w-4 text-[#f26e24] focus:ring-[#f26e24] border-gray-300 rounded"
              />
              <label htmlFor="originalDlVerified" className="ml-2 block text-sm text-gray-900">
                Original Driving License
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="voterIdVerified"
                checked={formData.voterIdVerified}
                onChange={(e) => setFormData(prev => ({ ...prev, voterIdVerified: e.target.checked }))}
                className="h-4 w-4 text-[#f26e24] focus:ring-[#f26e24] border-gray-300 rounded"
              />
              <label htmlFor="voterIdVerified" className="ml-2 block text-sm text-gray-900">
                Voter ID
              </label>
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="bg-white rounded-lg shadow p-6">
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
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !formData.termsAccepted}
            className="px-6 py-2 bg-[#f26e24] text-white rounded-md hover:bg-[#d95e1d] focus:outline-none focus:ring-2 focus:ring-[#f26e24] focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Booking'}
          </button>
        </div>
      </div>
    </form>
  );
} 