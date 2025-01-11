'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import logger from '@/lib/logger';

interface Document {
  type: 'driving_license' | 'address_proof';
  status: 'pending' | 'approved' | 'rejected';
  file?: File;
  preview?: string;
  message?: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Record<string, Document>>({
    driving_license: {
      type: 'driving_license',
      status: 'pending'
    },
    address_proof: {
      type: 'address_proof',
      status: 'pending'
    }
  });

  const handleFileChange = (type: keyof typeof documents) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setDocuments(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          file,
          preview: reader.result as string,
          status: 'pending'
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async (type: keyof typeof documents) => {
    const doc = documents[type];
    if (!doc.file) {
      toast.error('Please select a file first');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', doc.file);
      formData.append('type', type);

      const response = await fetch('/api/user/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload document');
      }

      setDocuments(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          status: 'pending',
          message: 'Document uploaded successfully. Waiting for verification.'
        }
      }));

      toast.success('Document uploaded successfully');
    } catch (error) {
      logger.error('Document upload error:', error);
      toast.error('Failed to upload document');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Document Verification</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(documents).map(([key, doc]) => (
          <div key={key} className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4 capitalize">
              {key.replace('_', ' ')}
            </h2>
            <div className="space-y-4">
              {doc.preview && (
                <div className="relative h-48 bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={doc.preview}
                    alt={`Preview of ${key}`}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex items-center space-x-4">
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange(key as keyof typeof documents)}
                    className="hidden"
                  />
                  <span className="block w-full px-4 py-2 text-center border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                    {doc.file ? 'Change File' : 'Select File'}
                  </span>
                </label>
                <button
                  onClick={() => handleUpload(key as keyof typeof documents)}
                  disabled={!doc.file || doc.status === 'approved'}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload
                </button>
              </div>
              {doc.message && (
                <p className="text-sm text-gray-600">{doc.message}</p>
              )}
              <div className="flex items-center space-x-2">
                <span className="text-sm">Status:</span>
                <span 
                  className={`text-sm font-medium ${
                    doc.status === 'approved' 
                      ? 'text-green-600' 
                      : doc.status === 'rejected'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                  }`}
                >
                  {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 