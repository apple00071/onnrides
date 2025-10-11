'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ExternalLink } from 'lucide-react';

interface DocumentItem {
  id: string;
  title: string;
  url: string;
  type: 'image' | 'pdf';
}

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  initialDocumentIndex?: number;
}

export function DocumentViewerModal({ 
  isOpen, 
  onClose, 
  documents, 
  initialDocumentIndex = 0 
}: DocumentViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialDocumentIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentDocument = documents[currentIndex];

  // Reset state when modal opens/closes or documents change
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialDocumentIndex);
      setIsLoading(true);
      setError(null);
    }
  }, [isOpen, initialDocumentIndex, documents]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, documents.length]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : documents.length - 1));
    setIsLoading(true);
    setError(null);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < documents.length - 1 ? prev + 1 : 0));
    setIsLoading(true);
    setError(null);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError('Failed to load document');
  };

  const downloadDocument = () => {
    if (currentDocument) {
      const link = document.createElement('a');
      link.href = currentDocument.url;
      link.download = `${currentDocument.title}.${currentDocument.type === 'pdf' ? 'pdf' : 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const openInNewTab = () => {
    if (currentDocument) {
      window.open(currentDocument.url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isOpen || !currentDocument) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-75"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 max-w-7xl max-h-[90vh] w-full mx-4 bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium text-gray-900">
              {currentDocument.title}
            </h3>
            <span className="text-sm text-gray-500">
              {currentIndex + 1} of {documents.length}
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Navigation buttons */}
            {documents.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
                  title="Previous document (←)"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={goToNext}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
                  title="Next document (→)"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            
            {/* Action buttons */}
            <button
              onClick={downloadDocument}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
              title="Download document"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={openInNewTab}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Document Content */}
        <div className="relative flex items-center justify-center min-h-[400px] max-h-[calc(90vh-120px)] bg-gray-100">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error ? (
            <div className="text-center p-8">
              <div className="text-red-600 mb-2">
                <X className="h-12 w-12 mx-auto" />
              </div>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : currentDocument.type === 'pdf' ? (
            <iframe
              src={currentDocument.url}
              className="w-full h-full min-h-[400px]"
              title={currentDocument.title}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          ) : (
            <img
              src={currentDocument.url}
              alt={currentDocument.title}
              className="max-w-full max-h-full object-contain"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
        </div>

        {/* Footer with navigation dots for multiple documents */}
        {documents.length > 1 && (
          <div className="flex items-center justify-center p-4 border-t bg-gray-50">
            <div className="flex space-x-2">
              {documents.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index);
                    setIsLoading(true);
                    setError(null);
                  }}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentIndex
                      ? 'bg-blue-600'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  title={documents[index].title}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
