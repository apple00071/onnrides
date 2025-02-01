import React from 'react';

export default function HelpPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Help Center</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">How do I make a booking?</h3>
              <p className="text-gray-600">Select your desired vehicle, choose pickup and drop-off dates, and follow the booking process.</p>
            </div>
            <div>
              <h3 className="font-medium">What documents do I need?</h3>
              <p className="text-gray-600">A valid driver's license, proof of identity, and a credit card for security deposit.</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Contact Support</h2>
          <div className="space-y-4">
            <p className="text-gray-600">Our support team is available 24/7 to assist you.</p>
            <div>
              <p className="font-medium">Email:</p>
              <p className="text-gray-600">support@onnrides.com</p>
            </div>
            <div>
              <p className="font-medium">Phone:</p>
              <p className="text-gray-600">+1 (555) 123-4567</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 