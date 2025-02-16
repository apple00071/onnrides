'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { DocumentIcon } from '@heroicons/react/24/solid';
import { useSession } from 'next-auth/react';
import logger from '@/lib/logger';

interface DocumentPreviewProps {
  fileUrl: string;
  fileName: string;
  fileType?: string;
  onClose?: () => void;
  showActions?: boolean;
  isAdmin?: boolean;
}

export function DocumentPreview({ 
  fileUrl, 
  fileName, 
  fileType, 
  onClose,
  showActions = false,
  isAdmin = false
}: DocumentPreviewProps) {
  const { data: session } = useSession();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!fileUrl) {
        setPreviewError('Missing file URL');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setPreviewError(null);

        // Fetch directly from the file URL
        const response = await fetch(fileUrl, {
          headers: {
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br'
          },
          next: { revalidate: 0 } // Disable cache
        });

        if (!response.ok) {
          throw new Error(`Failed to load document: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
        setPreviewError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Error fetching document:', {
          error: errorMessage,
          fileUrl,
          fileName,
          fileType,
          isAdmin
        });
        setPreviewError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocument();

    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [fileUrl, fileName, fileType, isAdmin]);

  // Enhanced file type detection
  const getFileType = () => {
    // Check by MIME type first
    if (fileType) {
      if (fileType.startsWith('image/')) return 'image';
      if (fileType === 'application/pdf') return 'pdf';
      if (fileType === 'application/msword' || 
          fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return 'document';
      }
    }

    // Check by file extension
    const extension = fileName.toLowerCase().split('.').pop();
    if (!extension) {
      // If no extension, check if it's an ID proof by name
      const name = fileName.toLowerCase();
      if (name.includes('id_proof') || name.includes('id proof') || 
          name.includes('license') || name.includes('passport') ||
          name.includes('identity') || name.includes('document')) {
        // Check if the URL ends with common image extensions
        if (fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|pdf)$/)) {
          return fileUrl.toLowerCase().endsWith('pdf') ? 'pdf' : 'image';
        }
      }
      return 'unknown';
    }

    // Common image formats
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif'];
    if (imageExtensions.includes(extension)) return 'image';

    // PDF files
    if (extension === 'pdf') return 'pdf';

    // Document files
    const documentExtensions = ['doc', 'docx'];
    if (documentExtensions.includes(extension)) return 'document';

    // Check URL for image/pdf extension if file extension is missing
    if (fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp|pdf)$/)) {
      return fileUrl.toLowerCase().endsWith('pdf') ? 'pdf' : 'image';
    }

    return 'unknown';
  };

  const fileTypeCategory = getFileType();

  const renderPreview = () => {
    if (!isAdmin && !session) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <DocumentIcon className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-sm text-gray-600 mb-2">Authentication required</p>
          <p className="text-xs text-gray-500">Please sign in to view this document</p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600 mb-4"></div>
          <p className="text-sm text-gray-600">Loading document preview...</p>
        </div>
      );
    }

    if (previewError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <DocumentIcon className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-sm text-gray-600 mb-2">Failed to load preview</p>
          <p className="text-xs text-gray-500 max-w-md">
            {previewError === 'Unknown error occurred' 
              ? 'The file might be unavailable or in an unsupported format'
              : previewError}
          </p>
        </div>
      );
    }

    switch (fileTypeCategory) {
      case 'image':
        return (
          <div className="flex justify-center items-center h-full bg-gray-50">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={fileName}
                className="max-w-full h-auto max-h-[70vh] object-contain"
                onError={() => {
                  setPreviewError('Failed to load image');
                  logger.error('Image preview error:', { fileName, fileUrl });
                }}
                loading="lazy"
              />
            ) : (
              <div className="animate-pulse flex justify-center items-center h-[70vh] w-full bg-gray-100">
                <DocumentIcon className="h-12 w-12 text-gray-300" />
              </div>
            )}
          </div>
        );

      case 'pdf':
        return (
          <div className="w-full h-[70vh] bg-gray-50">
            {imageUrl ? (
              <iframe
                src={`${imageUrl}#toolbar=0`}
                className="w-full h-full"
                onError={() => {
                  setPreviewError('Failed to load PDF');
                  logger.error('PDF preview error:', { fileName, fileUrl });
                }}
                title={fileName}
              />
            ) : (
              <div className="animate-pulse flex justify-center items-center h-full w-full bg-gray-100">
                <DocumentIcon className="h-12 w-12 text-gray-300" />
              </div>
            )}
          </div>
        );

      case 'document':
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <DocumentIcon className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600">
              Document preview not available
            </p>
            <p className="text-xs text-gray-500 mt-2">
              This document type can be downloaded but not previewed
            </p>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <DocumentIcon className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600">
              Preview not available for this document type
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Supported formats: JPG, JPEG, PNG, GIF, WEBP, PDF
            </p>
          </div>
        );
    }
  };

  if (isFullscreen) {
    return (
      <Dialog
        open={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="relative bg-white rounded-lg w-full max-w-5xl">
            <Dialog.Title className="sr-only">
              Document Preview: {fileName}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Fullscreen preview of {fileName}. Press Escape to exit fullscreen mode.
            </Dialog.Description>
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-2 right-2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 z-10"
              aria-label="Close fullscreen preview"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <div className="overflow-hidden">
              {renderPreview()}
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    );
  }

  return (
    <div className="relative bg-white rounded-lg overflow-hidden flex flex-col">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-2 rounded-full bg-gray-100 hover:bg-gray-200 z-10"
        >
          <XMarkIcon className="h-5 w-5 text-gray-500" />
        </button>
      )}
      <div className="flex-1 max-h-[70vh] overflow-auto">
        {renderPreview()}
      </div>
      <div className="p-4 border-t bg-white">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 truncate max-w-[200px]">
            {fileName}
          </span>
          <div className="flex items-center gap-3">
            <a
              href={fileUrl}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#f26e24] hover:text-[#e85d1c] text-sm font-medium flex items-center"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
            </a>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#f26e24] hover:text-[#e85d1c] text-sm font-medium flex items-center"
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Open in New Tab
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 