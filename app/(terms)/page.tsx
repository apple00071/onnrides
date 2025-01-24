'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link 
          href="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-8 text-gray-900">Terms & Conditions</h1>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="prose prose-lg max-w-none">
            <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg mb-8">
              <p className="text-sm text-yellow-800 font-medium">
                THESE TERMS OF SERVICE CONSTITUTE AN ELECTRONIC RECORD IN ACCORDANCE WITH THE INFORMATION TECHNOLOGY ACT, 2000. BY USING THE PLATFORM, YOU AGREE TO BE BOUND BY THESE TERMS. IF YOU DO NOT AGREE WITH ANY PART OF THESE TERMS, PLEASE DO NOT USE OUR SERVICES.
              </p>
            </div>

            <p className="text-gray-700">
              These Terms of Service ("Terms") govern your use of the Onn Rides platform (website and mobile application). By accessing or using our services, you agree to comply with and be bound by these terms.
            </p>

            <h2 className="text-2xl font-semibold mt-10 mb-4 text-gray-900">1. Eligibility Requirements</h2>
            <ul className="list-disc pl-6 space-y-3 text-gray-700">
              <li>Minimum age requirement: 18 years</li>
              <li>Valid driving license is mandatory</li>
              <li>Required documents for domestic users:
                <ul className="list-disc pl-6 mt-2">
                  <li>Original Indian Driving License (learner's license not accepted)</li>
                  <li>Original Aadhaar Card</li>
                  <li>Additional government-issued ID may be required</li>
                </ul>
              </li>
            </ul>

            <h2 className="text-2xl font-semibold mt-10 mb-4 text-gray-900">2. Booking Terms</h2>
            <ul className="list-disc pl-6 space-y-3 text-gray-700">
              <li>Minimum booking duration:
                <ul className="list-disc pl-6 mt-2">
                  <li>Weekdays: 12 hours minimum charge applies</li>
                  <li>Weekends (Saturday & Sunday): 24 hours minimum duration</li>
                </ul>
              </li>
              <li>All listed prices exclude applicable taxes and fuel charges</li>
              <li>Security deposit is required and will be refunded post-rental inspection</li>
              <li>Bookings are subject to vehicle availability</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-10 mb-4 text-gray-900">3. Cancellation Policy</h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700">Cancellation charges may apply based on timing:</p>
              <ul className="list-disc pl-6 mt-3 space-y-2 text-gray-700">
                <li>More than 24 hours before pickup: Full refund</li>
                <li>12-24 hours before pickup: 50% penalty</li>
                <li>Less than 12 hours or no-show: 100% penalty</li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold mt-10 mb-4 text-gray-900">4. Contact Information</h2>
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-gray-700 mb-4">For any questions or concerns regarding these terms, please contact us:</p>
              <ul className="space-y-2 text-gray-700">
                <li><span className="font-medium">Email:</span> support@onnrides.com</li>
                <li><span className="font-medium">Phone:</span> +91 (000) 000-0000</li>
                <li><span className="font-medium">Hours:</span> Monday to Sunday, 9:00 AM - 9:00 PM IST</li>
              </ul>
            </div>

            <div className="mt-10 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 