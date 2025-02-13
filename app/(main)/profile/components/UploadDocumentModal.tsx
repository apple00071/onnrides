import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

type DocumentType = 'dl_front' | 'dl_back' | 'dl_additional' | 'id_front' | 'id_back' | 'id_additional';

const getDocumentApiType = (type: DocumentType): string => {
  switch (type) {
    case 'dl_front':
    case 'dl_back':
    case 'dl_additional':
      return 'license';
    case 'id_front':
    case 'id_back':
    case 'id_additional':
      return 'id_proof';
    default:
      return 'license';
  }
};

const getDocumentSide = (type: DocumentType): string => {
  if (type.includes('front')) return 'front';
  if (type.includes('back')) return 'back';
  return 'additional';
};

export default function UploadDocumentModal({ isOpen, onClose, onUploadSuccess }: UploadDocumentModalProps) {
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<DocumentType, File | null>>({
    dl_front: null,
    dl_back: null,
    dl_additional: null,
    id_front: null,
    id_back: null,
    id_additional: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = async (type: DocumentType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('File size should be less than 5MB');
      return;
    }
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      toast.error('Only JPEG, PNG, and PDF files are allowed');
      return;
    }

    setSelectedFiles(prev => ({ ...prev, [type]: file }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Check if at least one document is selected
      const hasSelectedFiles = Object.values(selectedFiles).some(file => file !== null);
      if (!hasSelectedFiles) {
        toast.error('Please select at least one document to upload');
        return;
      }

      // Upload all selected files
      const uploadPromises = Object.entries(selectedFiles)
        .filter(([_, file]) => file !== null)
        .map(async ([type, file]) => {
          if (!file) return;

          setUploadingType(type as DocumentType);
          const formData = new FormData();
          formData.append('file', file);
          formData.append('type', getDocumentApiType(type as DocumentType));
          formData.append('side', getDocumentSide(type as DocumentType));
          formData.append('document_type', type);

          const response = await fetch('/api/user/documents', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || `Failed to upload ${type}`);
          }

          return response.json();
        });

      await Promise.all(uploadPromises);
      toast.success('Documents uploaded successfully');
      onUploadSuccess(); // Call this after all uploads are complete
      handleClose();
    } catch (error) {
      logger.error('Error uploading documents:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload documents');
    } finally {
      setIsSubmitting(false);
      setUploadingType(null);
    }
  };

  const handleClose = () => {
    setSelectedFiles({
      dl_front: null,
      dl_back: null,
      dl_additional: null,
      id_front: null,
      id_back: null,
      id_additional: null
    });
    setUploadingType(null);
    setIsSubmitting(false);
    onClose();
  };

  const renderUploadSection = (type: DocumentType, label: string) => (
    <div className="relative">
      <label className="block w-full">
        <div className={`border border-dashed rounded-lg p-4 flex flex-col items-center justify-center min-h-[150px] cursor-pointer transition-colors ${
          uploadingType === type ? 'bg-gray-50 border-gray-200' : 'border-gray-300 hover:border-gray-400'
        }`}>
          {selectedFiles[type] ? (
            <div className="text-center">
              <div className="w-8 h-8 mb-2 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm text-gray-600">{selectedFiles[type]?.name}</span>
            </div>
          ) : (
            <>
              <div className="w-8 h-8 mb-2 flex items-center justify-center">
                <span className="text-2xl text-gray-400">+</span>
              </div>
              <span className="text-sm text-gray-500">Click to upload</span>
            </>
          )}
          {uploadingType === type && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
            </div>
          )}
        </div>
        <input
          type="file"
          className="hidden"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={(e) => handleFileChange(type, e)}
          disabled={isSubmitting}
        />
      </label>
      <div className="text-center mt-2">
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold mb-4">Upload Documents</DialogTitle>
        </DialogHeader>

        {/* DL Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Upload DL</h3>
          <div className="mb-4">
            <ul className="list-disc text-sm space-y-1 ml-4 text-gray-600">
              <li>Please upload both sides of your original driving license or international driving permit.</li>
              <li>Ensure that the images uploaded clearly show your details to ensure faster verification.</li>
            </ul>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {renderUploadSection('dl_front', 'Front')}
            {renderUploadSection('dl_back', 'Back')}
            {renderUploadSection('dl_additional', 'Add More')}
          </div>
        </div>

        {/* ID Section */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Upload ID</h3>
          <div className="mb-4">
            <ul className="list-disc text-sm space-y-1 ml-4 text-gray-600">
              <li>Please upload a valid government-issued ID (Aadhaar, Passport, etc.).</li>
              <li>Make sure all details are clearly visible in the uploaded images.</li>
            </ul>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {renderUploadSection('id_front', 'Front')}
            {renderUploadSection('id_back', 'Back')}
            {renderUploadSection('id_additional', 'Add More')}
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !Object.values(selectedFiles).some(file => file !== null)}
            className="bg-[#f26e24] text-white hover:bg-[#e05d13]"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Uploading...
              </div>
            ) : (
              'Submit Documents'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 