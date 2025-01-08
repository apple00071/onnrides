'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/providers/AuthProvider';

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  is_documents_verified: boolean;
  documents_submitted: boolean;
  role: string;
  created_at: string;
  updated_at: string;
}

interface Document {
  id: string;
  document_type: string;
  file_url: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editedPhone, setEditedPhone] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [documentFiles, setDocumentFiles] = useState({
    profile_photo: null,
    dl_front: null,
    dl_back: null,
    aadhar_front: null,
    aadhar_back: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch('/api/user/documents', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data.documents || []);
      
      if (profile && data.is_verified !== profile.is_documents_verified) {
        setProfile(prev => prev ? {
          ...prev,
          is_documents_verified: data.is_verified,
          documents_submitted: data.documents_submitted
        } : null);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch documents');
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchDocuments();
    }
  }, [user, fetchProfile, fetchDocuments]);

  useEffect(() => {
    if (profile) {
      setEditedPhone(profile.phone || '');
      setEditedEmail(profile.email || '');
    }
  }, [profile]);

  const handleUpdateProfile = async (field: 'phone' | 'email', value: string) => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to update ${field}`);
      }
      
      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`);
      
      if (field === 'phone') setIsEditingPhone(false);
      if (field === 'email') setIsEditingEmail(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : `Failed to update ${field}`);
    }
  };

  const handleFileUpload = async (type: string, file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/user/documents/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload document');
      }

      await fetchDocuments();
      toast.success('Document uploaded successfully');
      
      // Update step based on uploaded documents
      const uploadedDocs = new Set(documents.map(doc => doc.document_type));
      uploadedDocs.add(type); // Add the newly uploaded document type
      
      // Calculate step based on uploaded documents
      if (uploadedDocs.has('dl_front') && uploadedDocs.has('dl_back')) {
        if (uploadedDocs.has('aadhar_front') && uploadedDocs.has('aadhar_back')) {
          setCurrentStep(4); // All documents uploaded
        } else {
          setCurrentStep(3); // DL documents uploaded
        }
      } else if (uploadedDocs.size > 0) {
        setCurrentStep(2); // At least one document uploaded
      } else {
        setCurrentStep(1); // No documents uploaded
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitDocuments = async () => {
    const requiredDocuments = ['dl_front', 'dl_back', 'aadhar_front', 'aadhar_back'];
    const uploadedTypes = documents.map(doc => doc.document_type);
    const missingDocuments = requiredDocuments.filter(type => !uploadedTypes.includes(type));

    if (missingDocuments.length > 0) {
      toast.error(`Please upload all required documents. Missing: ${missingDocuments.join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/user/documents/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit documents');
      }
      
      toast.success('Documents submitted successfully');
      setCurrentStep(4);
      await fetchDocuments();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit documents');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-700">User not found</h2>
        <p className="text-gray-500 mt-2">The user you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#f26e24]"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-items-center">
        {/* Profile Card - Left side */}
        <div className="w-[345px] h-[245px]">
          <div className="bg-white rounded-lg p-6 shadow-sm h-full">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                  {profile?.name ? (
                    <span className="text-2xl font-semibold text-gray-700">
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                  ) : null}
                </div>
                <button className="absolute bottom-0 right-0 bg-[#f26e24] p-2 rounded-full text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>

              <h2 className="mt-4 text-xl font-semibold">{profile?.name || 'Current User Name'}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Account Status: {' '}
                <span className={profile?.is_documents_verified ? 'text-green-600' : 'text-yellow-600'}>
                  {profile?.is_documents_verified ? 'Verified' : 
                    profile?.documents_submitted ? 'Documents Under Review' : 
                      'Awaiting Document Upload'}
                </span>
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div className="relative">
                <div className="flex items-center border rounded-lg p-3">
                  <span className="text-gray-500 mr-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </span>
                  {isEditingPhone ? (
                    <input
                      type="tel"
                      value={editedPhone}
                      onChange={(e) => setEditedPhone(e.target.value)}
                      className="flex-1 outline-none"
                      placeholder="Phone Number"
                    />
                  ) : (
                    <span className="flex-1">{profile?.phone || 'Add Phone Number'}</span>
                  )}
                  <button 
                    onClick={() => {
                      if (isEditingPhone) {
                        handleUpdateProfile('phone', editedPhone);
                      } else {
                        setIsEditingPhone(true);
                      }
                    }}
                    className="text-[#f26e24]"
                  >
                    {isEditingPhone ? 'Save' : 'Edit'}
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="flex items-center border rounded-lg p-3">
                  <span className="text-gray-500 mr-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  {isEditingEmail ? (
                    <input
                      type="email"
                      value={editedEmail}
                      onChange={(e) => setEditedEmail(e.target.value)}
                      className="flex-1 outline-none"
                      placeholder="Email"
                    />
                  ) : (
                    <span className="flex-1">{profile?.email || 'Add Email'}</span>
                  )}
                  <button 
                    onClick={() => {
                      if (isEditingEmail) {
                        handleUpdateProfile('email', editedEmail);
                      } else {
                        setIsEditingEmail(true);
                      }
                    }}
                    className="text-[#f26e24]"
                  >
                    {isEditingEmail ? 'Save' : 'Edit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Document Verification Card - Right side */}
        <div className="bg-white rounded-lg p-6 shadow-sm w-full max-w-xl">
          <h2 className="text-xl font-semibold mb-4">Document Verification</h2>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p className="mb-2">Please upload the following documents:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Driving License/International Driving Permit</li>
                <li>Identification Proof</li>
              </ul>
            </div>

            <div className="text-sm text-gray-600">
              <p>Accepted forms of ID that can be uploaded are: Aadhaar Card, Passport. For international users, a passport along with a valid visa.</p>
              <p className="mt-2">For bulk bookings, contact our support team.</p>
              <p className="mt-2">Ensure to upload pictures of original documents only.</p>
              <p className="mt-2">Learner license is not applicable for renting a vehicle with us.</p>
            </div>

            <div className="flex justify-between items-center mt-6">
              <div className="flex items-center space-x-8">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-[#f26e24] text-white' : 'bg-gray-200'}`}>1</div>
                  <span className="text-xs mt-1">Profile Photo</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-[#f26e24] text-white' : 'bg-gray-200'}`}>2</div>
                  <span className="text-xs mt-1">Upload DL</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 3 ? 'bg-[#f26e24] text-white' : 'bg-gray-200'}`}>3</div>
                  <span className="text-xs mt-1">Upload ID</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 4 ? 'bg-[#f26e24] text-white' : 'bg-gray-200'}`}>4</div>
                  <span className="text-xs mt-1">Submit</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              {['dl_front', 'dl_back', 'aadhar_front', 'aadhar_back'].map((type) => {
                const doc = documents.find(d => d.document_type === type);
                const isRejected = doc?.status === 'rejected';
                const label = {
                  dl_front: 'DL Front',
                  dl_back: 'DL Back',
                  aadhar_front: 'Aadhar Front',
                  aadhar_back: 'Aadhar Back'
                }[type];

                return (
                  <div key={type} className="relative">
                    {doc ? (
                      <div className="border-2 border-gray-200 rounded-lg p-4 text-center">
                        <div className="flex flex-col items-center">
                          <a 
                            href={doc.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#f26e24] hover:underline mb-2"
                          >
                            View {label}
                          </a>
                          {isRejected && (
                            <label className="cursor-pointer text-red-500 hover:text-red-600">
                              <input
                                type="file"
                                className="hidden"
                                accept="image/jpeg,image/png,application/pdf"
                                onChange={(e) => e.target.files?.[0] && handleFileUpload(type, e.target.files[0])}
                              />
                              Replace Document
                            </label>
                          )}
                          <span className={`text-xs mt-1 ${
                            doc.status === 'verified' ? 'text-green-500' :
                              doc.status === 'rejected' ? 'text-red-500' :
                                'text-yellow-500'
                          }`}>
                            {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-[#f26e24] block">
                        <input
                          type="file"
                          className="hidden"
                          accept="image/jpeg,image/png,application/pdf"
                          onChange={(e) => e.target.files?.[0] && handleFileUpload(type, e.target.files[0])}
                        />
                        <p className="text-sm font-medium">Upload {label}</p>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Submit button */}
            {!profile?.is_documents_verified && !profile?.documents_submitted && documents.length === 4 && (
              <button
                onClick={handleSubmitDocuments}
                disabled={isSubmitting}
                className="mt-6 w-full py-2 px-4 rounded-md bg-[#f26e24] text-white hover:bg-[#e05d13] disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Documents for Verification'}
              </button>
            )}

            <div className="mt-6 text-sm text-gray-500 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                We take our user's privacy very seriously. To learn more, check out our{' '}
                <Link href="/privacy-policy" className="text-[#f26e24] hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 