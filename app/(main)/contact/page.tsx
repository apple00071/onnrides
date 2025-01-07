'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Send email using your preferred method (e.g., API endpoint)
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Message sent successfully!');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      alert('Failed to send message. Please try again.');
    }
  };

  return (
    <main className="container mx-auto px-4 py-2 mt-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Contact Us</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div>
            <div className="bg-white p-8 rounded-lg shadow-sm mb-8">
              <h2 className="text-2xl font-semibold mb-6">Get in Touch</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Address</h3>
                  <p className="text-gray-600">
                    123 Main Street<br />
                    Hyderabad, Telangana 500001<br />
                    India
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Call Us</h3>
                  <div className="space-y-2">
                    <Link href="tel:+918309031203" className="block text-yellow-600 hover:text-yellow-700">
                      +91 83090 31203
                    </Link>
                    <Link href="tel:+919182495481" className="block text-yellow-600 hover:text-yellow-700">
                      +91 91824 95481
                    </Link>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Email</h3>
                  <Link href="mailto:support@onnrides.com" className="text-yellow-600 hover:text-yellow-700">
                    support@onnrides.com
                  </Link>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h2 className="text-2xl font-semibold mb-6">Business Hours</h2>
              <div className="space-y-2">
                <p className="flex justify-between">
                  <span className="text-gray-600">Monday - Friday:</span>
                  <span>9:00 AM - 10:30 PM</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">Saturday:</span>
                  <span>9:00 AM - 10:30 PM</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">Sunday:</span>
                  <span>9:00 AM - 10:30 PM</span>
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold mb-6">Send us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  required
                />
              </div>
              <div>
                <label htmlFor="subject" className="block text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  required
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-gray-700 mb-2">Message</label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={5}
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  required
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-yellow-400 text-black py-3 rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
} 