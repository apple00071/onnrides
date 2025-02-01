import React from 'react';

export default function RefundPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Refund Policy</h1>
      <div className="prose max-w-none">
        <h2 className="text-xl font-semibold mb-4">1. Cancellation and Refund Policy</h2>
        <p className="mb-4">
          We strive to provide the best service possible. However, we understand that sometimes you may need to cancel your booking.
        </p>
        
        <h3 className="text-lg font-semibold mb-3">Cancellation Timeline:</h3>
        <ul className="list-disc pl-6 mb-4">
          <li>More than 24 hours before pickup: Full refund</li>
          <li>12-24 hours before pickup: 75% refund</li>
          <li>6-12 hours before pickup: 50% refund</li>
          <li>Less than 6 hours: No refund</li>
        </ul>

        <h2 className="text-xl font-semibold mb-4">2. Refund Processing</h2>
        <p className="mb-4">
          Refunds will be processed within 5-7 business days and will be credited back to the original payment method.
        </p>

        <h2 className="text-xl font-semibold mb-4">3. Contact Us</h2>
        <p>
          If you have any questions about our refund policy, please contact our support team.
        </p>
      </div>
    </div>
  );
} 