'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { logger } from '@/lib/logger';
import { useRouter } from 'next/navigation';

interface Profile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string | null;
  is_blocked: boolean | null;
  is_verified: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
}

interface Document {
  id: string;
  type: 'license' | 'id_proof' | 'address_proof';
  status: 'pending' | 'approved' | 'rejected';
  url: string;
  created_at: Date;
  updated_at: Date;
}

const DOCUMENT_TYPES = ['license', 'id_proof', 'address_proof'] as const;

export default function ProfileClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data);
    } catch (error) {
      logger.error('Error fetching profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch profile');
      if (error instanceof Error && error.message === 'Authentication required') {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch('/api/user/documents', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      logger.error('Error fetching documents:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch documents');
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchProfile();
      fetchDocuments();
    }
  }, [status, router, fetchProfile, fetchDocuments]);

  const handleFileUpload = async (type: typeof DOCUMENT_TYPES[number], file: File) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    setUploading(true);
    try {
      const response = await fetch('/api/user/documents', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          // Don't set Content-Type with FormData, browser will set it automatically with boundary
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload document');
      }

      const data = await response.json();
      toast.success(data.message || 'Document uploaded successfully');
      fetchDocuments(); // Refresh documents list
    } catch (error) {
      logger.error('Error uploading document:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const formatDocumentType = (type: string) => {
    const typeMap = {
      'license': 'Driving License',
      'id_proof': 'ID Proof',
      'address_proof': 'Address Proof'
    };
    return typeMap[type as keyof typeof typeMap] || type;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      {profile ? (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
                <div className="space-y-3">
                  <p><span className="font-medium">Name:</span> {profile.name || 'Not provided'}</p>
                  <p><span className="font-medium">Email:</span> {profile.email}</p>
                  <p><span className="font-medium">Phone:</span> {profile.phone || 'Not provided'}</p>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-4">Account Status</h2>
                <div className="space-y-3">
                  <p>
                    <span className="font-medium">Account Status:</span>{' '}
                    <span className={`${
                      profile.is_verified ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {profile.is_verified ? 'Verified' : 'Pending Verification'}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">Member Since:</span>{' '}
                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Documents</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {DOCUMENT_TYPES.map((type) => {
                const existingDoc = Array.isArray(documents) ? documents.find(doc => doc.type === type) : undefined;
                return (
                  <div key={type} className="border rounded-lg p-4">
                    <h3 className="font-medium mb-2">{formatDocumentType(type)}</h3>
                    {existingDoc ? (
                      <div className="space-y-2">
                        <p className={`text-sm ${
                          existingDoc.status === 'approved' ? 'text-green-600' :
                          existingDoc.status === 'rejected' ? 'text-red-600' :
                          'text-yellow-600'
                        }`}>
                          Status: {existingDoc.status.charAt(0).toUpperCase() + existingDoc.status.slice(1)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Last updated: {new Date(existingDoc.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mb-2">No document uploaded</p>
                    )}
                    <label className="block mt-2">
                      <span className="sr-only">Choose file</span>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(type, file);
                          }
                        }}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-sm file:font-semibold
                          file:bg-blue-50 file:text-blue-700
                          hover:file:bg-blue-100
                          disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-600">
          Failed to load profile. Please try refreshing the page.
        </div>
      )}
    </div>
  );
} 