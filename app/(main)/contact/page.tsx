'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { toast } from 'react-hot-toast';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Implement form submission
    toast.success('Message sent successfully!');
    setFormData({ name: '', email: '', phone: '', message: '' });
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <main className='container mx-auto px-4 py-8 mt-16'>
      <h1 className='text-3xl font-bold mb-8 text-center'>Contact Us</h1>
      
      <div className='max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12'>
        {/* Contact Information */}
        <div className='space-y-8'>
          <section>
            <h2 className='text-2xl font-semibold mb-4'>Get in Touch</h2>
            <p className='text-gray-600 mb-6'>
              Have questions about our services? We&apos;re here to help!
            </p>
            
            <div className='space-y-4'>
              <div>
                <h3 className='font-semibold mb-2'>Phone Numbers</h3>
                <p className='text-gray-600'>+91 83090 31203</p>
                <p className='text-gray-600'>+91 91824 95481</p>
              </div>

              <div>
                <h3 className='font-semibold mb-2'>Email</h3>
                <p className='text-gray-600'>support@onnrides.com</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className='text-2xl font-semibold mb-4'>Our Locations</h2>
            <div className='space-y-4'>
              <div>
                <h3 className='font-semibold mb-2'>Eragadda Branch</h3>
                <p className='text-gray-600'>1st Branch</p>
                <p className='text-gray-600'>Hyderabad, Telangana</p>
              </div>

              <div>
                <h3 className='font-semibold mb-2'>Madhapur Branch</h3>
                <p className='text-gray-600'>2nd Branch</p>
                <p className='text-gray-600'>Hyderabad, Telangana</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className='text-2xl font-semibold mb-4'>Business Hours</h2>
            <p className='text-gray-600'>Monday - Sunday: 24/7</p>
          </section>
        </div>

        {/* Contact Form */}
        <div className='bg-white p-6 rounded-lg shadow-md'>
          <h2 className='text-2xl font-semibold mb-6'>Send us a Message</h2>
          <form onSubmit={handleSubmit} className='space-y-6'>
            <div>
              <label htmlFor='name' className='block text-sm font-medium text-gray-700 mb-1'>
                Name
              </label>
              <input
                type='text'
                id='name'
                name='name'
                value={formData.name}
                onChange={handleChange}
                required
                className='w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#f26e24] focus:border-[#f26e24]'
              />
            </div>

            <div>
              <label htmlFor='email' className='block text-sm font-medium text-gray-700 mb-1'>
                Email
              </label>
              <input
                type='email'
                id='email'
                name='email'
                value={formData.email}
                onChange={handleChange}
                required
                className='w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#f26e24] focus:border-[#f26e24]'
              />
            </div>

            <div>
              <label htmlFor='phone' className='block text-sm font-medium text-gray-700 mb-1'>
                Phone
              </label>
              <input
                type='tel'
                id='phone'
                name='phone'
                value={formData.phone}
                onChange={handleChange}
                required
                className='w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#f26e24] focus:border-[#f26e24]'
              />
            </div>

            <div>
              <label htmlFor='message' className='block text-sm font-medium text-gray-700 mb-1'>
                Message
              </label>
              <textarea
                id='message'
                name='message'
                value={formData.message}
                onChange={handleChange}
                required
                rows={4}
                className='w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#f26e24] focus:border-[#f26e24]'
              />
            </div>

            <button
              type='submit'
              className='w-full bg-[#f26e24] text-white py-2 px-4 rounded-md hover:bg-[#e05d13] transition-colors'
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </main>
  );
} 