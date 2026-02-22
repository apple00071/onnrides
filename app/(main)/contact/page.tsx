'use client';

import { useState } from 'react';
import { Grid } from '@/components/layout/Grid';

interface FormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export default function ContactPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const cleaned = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({
        ...prev,
        [name]: cleaned
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement form submission
    console.log(formData);
  };

  return (
    <div className="py-8 space-y-8">
      <h1 className="h1 text-center">Contact Us</h1>

      <Grid cols={1} mdCols={2} gap={8} className="max-w-6xl mx-auto">
        {/* Contact Information */}
        <div className="space-y-8">
          <section>
            <h2 className="h2">Get in Touch</h2>
            <p className="text-gray-600 mb-6">
              Have questions about our services? We&apos;re here to help!
            </p>

            <div className="space-y-4">
              <div>
                <h3 className="h3">Phone Numbers</h3>
                <p className="text-gray-600">+91 83090 31203</p>
                <p className="text-gray-600">+91 91824 95481</p>
              </div>

              <div>
                <h3 className="h3">Email</h3>
                <p className="text-gray-600">support@onnrides.com</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="h2">Our Locations</h2>
            <div className="space-y-4">
              <div>
                <h3 className="h3">Eragadda Branch</h3>
                <p className="text-gray-600">1st Branch</p>
                <p className="text-gray-600">Hyderabad, Telangana</p>
              </div>

              <div>
                <h3 className="h3">Madhapur Branch</h3>
                <p className="text-gray-600">2nd Branch</p>
                <p className="text-gray-600">Hyderabad, Telangana</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="h2">Business Hours</h2>
            <p className="text-gray-600">Monday - Sunday: 24/7</p>
          </section>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-lg shadow-sm p-4 xs:p-6">
          <h2 className="h2 mb-6">Send us a Message</h2>
          <form onSubmit={handleSubmit} className="space-y-4 xs:space-y-6">
            <div>
              <label htmlFor="name" className="form-label">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className="form-label">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div>
              <label htmlFor="message" className="form-label">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                className="form-textarea"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
            >
              Send Message
            </button>
          </form>
        </div>
      </Grid>
    </div>
  );
} 