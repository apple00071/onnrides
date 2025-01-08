export default function PrivacyPolicyPage() {
  return (
    <main className="container mx-auto px-4 py-8 mt-16 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Information We Collect</h2>
          <p className="text-gray-600 mb-4">
            We collect information that you provide directly to us, including:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Name, email address, phone number, and other contact details</li>
            <li>Government-issued identification for vehicle rental verification</li>
            <li>Payment information</li>
            <li>Driving license and other documentation required for vehicle rental</li>
            <li>Booking history and preferences</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">How We Use Your Information</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>To process your vehicle rental bookings</li>
            <li>To communicate with you about your rentals</li>
            <li>To verify your identity and eligibility to rent vehicles</li>
            <li>To improve our services and customer experience</li>
            <li>To send you updates about our services (with your consent)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Information Security</h2>
          <p className="text-gray-600 mb-4">
            We implement appropriate security measures to protect your personal information. This includes:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Secure data storage and encryption</li>
            <li>Regular security assessments</li>
            <li>Limited access to personal information by authorized personnel only</li>
            <li>Secure payment processing through trusted providers</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Your Rights</h2>
          <p className="text-gray-600 mb-4">
            You have the right to:
          </p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your information</li>
            <li>Opt-out of marketing communications</li>
            <li>Withdraw consent for data processing</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
          <p className="text-gray-600">
            If you have any questions about our privacy policy or how we handle your data, please contact us at:
          </p>
          <div className="mt-4 text-gray-600">
            <p>Email: privacy@onnrides.com</p>
            <p>Phone: +91 83090 31203</p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Updates to This Policy</h2>
          <p className="text-gray-600">
            We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the effective date.
          </p>
          <p className="text-gray-600 mt-4">
            Last updated: March 14, 2024
          </p>
        </section>
      </div>
    </main>
  );
} 