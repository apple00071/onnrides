'use client';

export default function TermsPage() {
  return (
    <main className="container mx-auto px-4 py-8 mt-16 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Terms and Conditions</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">1. Rental Requirements</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Must be at least 18 years old</li>
            <li>Valid government-issued ID</li>
            <li>Valid driving license</li>
            <li>Security deposit may be required for certain vehicles</li>
            <li>Additional documentation for outstation rentals</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">2. Booking and Payment</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Advance booking required</li>
            <li>Payment must be made before vehicle pickup</li>
            <li>Security deposit is refundable subject to vehicle condition</li>
            <li>Cancellation charges may apply</li>
            <li>20% charges applicable for outstation rentals</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">3. Vehicle Usage</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Vehicle must be used in accordance with traffic rules</li>
            <li>No commercial use allowed</li>
            <li>No modifications to the vehicle</li>
            <li>Only authorized drivers can operate the vehicle</li>
            <li>Vehicle must be returned with the same fuel level</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">4. Outstation Policy</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Only Royal Enfield vehicles allowed for outstation trips</li>
            <li>Additional security deposit required</li>
            <li>20% surcharge on rental fee</li>
            <li>Prior approval required</li>
            <li>Additional documentation needed</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">5. Damages and Insurance</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Renter is responsible for any damages during rental period</li>
            <li>Basic insurance coverage included</li>
            <li>Security deposit may be used to cover damages</li>
            <li>Accidents must be reported immediately</li>
            <li>Police report required for accidents</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">6. Return Policy</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Vehicle must be returned at scheduled time</li>
            <li>Late returns will incur additional charges</li>
            <li>Vehicle must be returned in original condition</li>
            <li>Fuel level must match pickup level</li>
            <li>All provided accessories must be returned</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">7. Cancellation Policy</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Free cancellation up to 24 hours before pickup</li>
            <li>50% charge for cancellations within 24 hours</li>
            <li>No refund for no-shows</li>
            <li>Rescheduling allowed subject to availability</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
          <p className="text-gray-600">
            For any queries regarding our terms and conditions, please contact us at:
          </p>
          <div className="mt-4 text-gray-600">
            <p>Phone: +91 83090 31203 / +91 91824 95481</p>
            <p>Email: support@onnrides.com</p>
          </div>
        </section>

        <p className="text-gray-600 mt-8">
          Last updated: March 14, 2024
        </p>
      </div>
    </main>
  );
} 