'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import logger from '@/lib/logger';
import { useRouter } from 'next/navigation';
import UploadDocumentModal from './UploadDocumentModal';

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
  avatar_url?: string;
}

interface Document {
  id: string;
  type: 'license' | 'id_proof' | 'address_proof';
  status: 'pending' | 'approved' | 'rejected';
  url: string;
  created_at: Date;
  updated_at: Date;
  document_type?: string;
}

const DOCUMENT_TYPES = ['license', 'id_proof', 'address_proof'] as const;

export default function ProfileClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleUpdateEmail = async (newEmail: string) => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newEmail }),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update email');
      }

      await fetchProfile(); // Refresh profile data
      toast.success('Email updated successfully');
    } catch (error) {
      logger.error('Error updating email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update email');
    }
  };

  // Add helper function to calculate progress
  const calculateProgress = (documents: Document[]) => {
    let progress = 0;
    
    // Profile photo is worth 25%
    progress += 25;
    
    // Check for DL documents (front and back) - each worth 25%
    const dlFront = documents.find(doc => doc.document_type === 'dl_front');
    const dlBack = documents.find(doc => doc.document_type === 'dl_back');
    if (dlFront && dlFront.status !== 'rejected') progress += 25;
    if (dlBack && dlBack.status !== 'rejected') progress += 25;
    
    // Check for ID documents (front and back) - each worth 12.5%
    const idFront = documents.find(doc => doc.document_type === 'id_front');
    const idBack = documents.find(doc => doc.document_type === 'id_back');
    if (idFront && idFront.status !== 'rejected') progress += 12.5;
    if (idBack && idBack.status !== 'rejected') progress += 12.5;
    
    return Math.min(Math.round(progress), 100);
  };

  // Add helper function to get step status
  const getStepStatus = (documents: Document[], step: 'profile' | 'dl_front' | 'dl_back' | 'id') => {
    switch (step) {
      case 'profile':
        return 'completed'; // Profile photo is always considered completed for now
      case 'dl_front': {
        const doc = documents.find(d => d.document_type === 'dl_front');
        return doc ? (doc.status === 'rejected' ? 'pending' : 'completed') : 'pending';
      }
      case 'dl_back': {
        const doc = documents.find(d => d.document_type === 'dl_back');
        return doc ? (doc.status === 'rejected' ? 'pending' : 'completed') : 'pending';
      }
      case 'id': {
        const idFront = documents.find(d => d.document_type === 'id_front');
        const idBack = documents.find(d => d.document_type === 'id_back');
        return (idFront || idBack) ? 
          ((idFront?.status === 'rejected' && idBack?.status === 'rejected') ? 'pending' : 'completed') 
          : 'pending';
      }
      default:
        return 'pending';
    }
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
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-lg border border-[#f26e24]/20 p-4 sm:p-6 w-full sm:w-[340px] h-auto sm:h-[445px] mx-auto">
          <div className="flex flex-col items-center">
            <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-full bg-gray-100 mb-3 flex items-center justify-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile?.name || 'Profile'}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 sm:w-10 h-8 sm:h-10 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-[#f26e24] mb-1">{profile?.name || 'PAVAN KUMAR'}</h2>
            <p className="text-gray-600 text-xs sm:text-sm mb-4 text-center">Account Status: <span className="font-medium">Awaiting Document Upload</span></p>

            <div className="w-full space-y-3">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <span className="text-gray-700 text-xs sm:text-sm break-all">{profile?.phone || 'No phone number'}</span>
              </div>
              <div className="flex items-center group relative">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                {isEditingEmail ? (
                  <div className="flex items-center flex-grow">
                    <input
                      type="email"
                      value={profile?.email || ''}
                      onChange={(e) => handleUpdateEmail(e.target.value)}
                      className="text-gray-700 text-xs sm:text-sm flex-grow bg-transparent border-b border-gray-300 focus:outline-none focus:border-[#f26e24] px-1 py-0.5"
                      autoFocus
                      onBlur={() => setIsEditingEmail(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setIsEditingEmail(false);
                        }
                      }}
                    />
                  </div>
                ) :
                  <>
                    <span className="text-gray-700 text-xs sm:text-sm break-all">{profile?.email || 'No email'}</span>
                    <button 
                      onClick={() => setIsEditingEmail(true)}
                      className="focus:outline-none ml-1"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        strokeWidth={1.5} 
                        stroke="currentColor" 
                        className="w-4 h-4 text-gray-400 hover:text-gray-600"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                  </>
                }
              </div>
            </div>
          </div>
        </div>

        {/* Document Verification Card */}
        <div className="bg-white rounded-lg border border-[#f26e24]/20 p-4 sm:p-8">
          <h2 className="text-lg sm:text-xl font-semibold text-[#f26e24] mb-4 sm:mb-6">Document Verification</h2>
          <div className="space-y-4 sm:space-y-6">
            <div>
              <p className="text-sm sm:text-base text-gray-700 mb-2">Please upload the following documents:</p>
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-gray-600 ml-2 sm:ml-4">
                <li>Driving License/International Driving Permit</li>
                <li>Identification Proof</li>
              </ul>
            </div>
            
            <div>
              <p className="text-sm sm:text-base text-gray-700">Accepted forms of ID that can be uploaded are:</p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Aadhaar Card, Passport. For international users, a passport along with a valid visa.</p>
            </div>

            <div>
              <p className="text-sm sm:text-base text-gray-700">Additional Information:</p>
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-gray-600 ml-2 sm:ml-4 mt-1">
                <li>For bulk bookings, contact our support team.</li>
                <li>Ensure to upload pictures of original documents only.</li>
                <li>Learner license is not applicable for renting a vehicle with us.</li>
              </ul>
            </div>

            {/* Progress Steps - Mobile Optimized */}
            <div className="mt-6 sm:mt-8">
              <div className="relative">
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-[2px] bg-gray-200">
                  <div 
                    className="absolute left-0 top-0 h-full bg-[#f26e24] transition-all duration-300" 
                    style={{ width: `${calculateProgress(documents)}%` }}
                  ></div>
                </div>
                <div className="relative flex justify-between">
                  {/* Profile Photo Step */}
                  <div className="flex flex-col items-center">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                      getStepStatus(documents, 'profile') === 'completed'
                        ? 'bg-[#f26e24] text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {getStepStatus(documents, 'profile') === 'completed' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <span className="text-[10px] sm:text-xs font-medium">1</span>
                      )}
                    </div>
                    <span className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-gray-600 whitespace-nowrap">Profile Photo</span>
                  </div>

                  {/* DL Front Step */}
                  <div className="flex flex-col items-center">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                      getStepStatus(documents, 'dl_front') === 'completed'
                        ? 'bg-[#f26e24] text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {getStepStatus(documents, 'dl_front') === 'completed' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <span className="text-[10px] sm:text-xs font-medium">2</span>
                      )}
                    </div>
                    <span className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-gray-600 whitespace-nowrap">DL Front</span>
                  </div>

                  {/* DL Back Step */}
                  <div className="flex flex-col items-center">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                      getStepStatus(documents, 'dl_back') === 'completed'
                        ? 'bg-[#f26e24] text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {getStepStatus(documents, 'dl_back') === 'completed' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <span className="text-[10px] sm:text-xs font-medium">3</span>
                      )}
                    </div>
                    <span className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-gray-600 whitespace-nowrap">DL Back</span>
                  </div>

                  {/* ID Step */}
                  <div className="flex flex-col items-center">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                      getStepStatus(documents, 'id') === 'completed'
                        ? 'bg-[#f26e24] text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {getStepStatus(documents, 'id') === 'completed' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <span className="text-[10px] sm:text-xs font-medium">4</span>
                      )}
                    </div>
                    <span className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-gray-600 whitespace-nowrap">ID Proof</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Document Button */}
            <div className="flex items-center justify-between mt-6 sm:mt-8">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-1 sm:gap-2 text-gray-700 hover:text-gray-900"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-sm sm:text-base font-medium">UPLOAD DOCUMENT</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={fetchDocuments}
      />
    </div>
  );
} 