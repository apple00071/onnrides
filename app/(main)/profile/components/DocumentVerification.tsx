'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import logger from '@/lib/logger';

interface DocumentVerificationProps {
  isVerified: boolean;
  documentsSubmitted: boolean;
  onUpload: (type: string, file: File) => Promise<void>;
  onSubmit: () => Promise<void>;
  documents: Array<{
    document_type: string;
    status: string;
    file_url: string;
  }>;
}

const documentTypes = [
  { key: 'drivers_license', label: 'Driver\'s License' },
  { key: 'national_id', label: 'National ID' },
  { key: 'proof_of_address', label: 'Proof of Address' }
];

const DocumentVerification = ({
  isVerified,
  documentsSubmitted,
  onUpload,
  onSubmit,
  documents
}: DocumentVerificationProps) => {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      await onUpload(type, file);
    } catch (error) {
      logger.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const getDocumentStatus = (type: string) => {
    const doc = documents.find(d => d.document_type === type);
    return doc?.status || 'not_uploaded';
  };

  const allDocumentsUploaded = documentTypes.every(
    ({ key }) => getDocumentStatus(key) !== 'not_uploaded'
  );

  return (
    <div className="bg-white rounded-lg shadow p-6 mt-6">
      <h2 className="text-2xl font-semibold mb-4">Document Verification</h2>

      {isVerified ? (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
          <p className="text-green-700">Your documents have been verified! You can now rent vehicles.</p>
        </div>
      ) : documentsSubmitted ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
          <p className="text-yellow-700">Your documents are under review. We&apos;ll notify you once they&apos;re verified.</p>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
          <p className="text-orange-700">Please upload your documents for verification to start renting vehicles.</p>
        </div>
      )}

      <p className="text-sm text-gray-500 mb-4">
        If you haven&apos;t uploaded your documents yet, you won&apos;t be able to make a booking.
      </p>

      <div className="space-y-4">
        {documentTypes.map(({ key, label }) => {
          const status = getDocumentStatus(key);
          const isUploaded = status !== 'not_uploaded';

          return (
            <div key={key} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{label}</h3>
                  <p className="text-sm text-gray-500">
                    {status === 'not_uploaded' && 'Not uploaded yet'}
                    {status === 'pending' && 'Pending verification'}
                    {status === 'verified' && 'Verified'}
                    {status === 'rejected' && 'Rejected - Please upload again'}
                  </p>
                </div>

                {!documentsSubmitted && (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,application/pdf"
                      capture="environment"
                      onChange={(e) => handleFileChange(e, key)}
                      disabled={uploading}
                    />
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-md ${isUploaded ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                      <Upload className="w-4 h-4" />
                      <span>{isUploaded ? 'Replace' : 'Upload'}</span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!isVerified && !documentsSubmitted && (
        <button
          onClick={onSubmit}
          disabled={!allDocumentsUploaded || uploading}
          className={`mt-6 w-full py-2 px-4 rounded-md ${allDocumentsUploaded && !uploading
              ? 'bg-[#f26e24] text-white hover:bg-[#e05d13]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
        >
          Submit Documents for Verification
        </button>
      )}
    </div>
  );
};

export default DocumentVerification;