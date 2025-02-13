import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Eye, Trash2, CheckCircle2, XCircle } from 'lucide-react';

interface Document {
  id: string;
  type: string;
  document_type: string;
  status: 'pending' | 'approved' | 'rejected';
  url: string;
  created_at: string;
}

interface UserDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: Document[];
  userId: string;
  onDocumentUpdate: () => void;
}

export default function UserDocumentsModal({ 
  isOpen, 
  onClose, 
  documents, 
  userId,
  onDocumentUpdate 
}: UserDocumentsModalProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState<Document | null>(null);

  const formatDocumentType = (type: string) => {
    const typeMap: Record<string, string> = {
      'dl_front': 'DL Front',
      'dl_back': 'DL Back',
      'dl_additional': 'DL Additional',
      'id_front': 'ID Front',
      'id_back': 'ID Back',
      'id_additional': 'ID Additional',
      'license': 'Driving License',
      'id_proof': 'ID Proof'
    };
    return typeMap[type] || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteDocument = async () => {
    if (!selectedDocument) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/users/${userId}/documents/${selectedDocument.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete document');
      }

      toast.success('Document deleted successfully');
      onDocumentUpdate(); // Refresh the documents list
    } catch (error) {
      logger.error('Error deleting document:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete document');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSelectedDocument(null);
    }
  };

  const handleStatusUpdate = async (documentId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/documents/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update document status');
      }

      toast.success(`Document ${newStatus} successfully`);
      onDocumentUpdate(); // Refresh the documents list
    } catch (error) {
      logger.error('Error updating document status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update document status');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>User Documents</DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            {documents.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No documents uploaded yet</p>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div 
                    key={doc.id} 
                    className="border rounded-lg p-4 flex items-center justify-between bg-white"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{formatDocumentType(doc.document_type || doc.type)}</h4>
                      <p className="text-sm text-gray-500">{formatDate(doc.created_at)}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview(doc)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>

                      {doc.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleStatusUpdate(doc.id, 'approved')}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleStatusUpdate(doc.id, 'rejected')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          setSelectedDocument(doc);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>

                    <div className="ml-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        doc.status === 'approved' 
                          ? 'bg-green-100 text-green-800'
                          : doc.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </div>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Preview Dialog */}
      <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Document Preview: {showPreview && formatDocumentType(showPreview.document_type || showPreview.type)}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex flex-col items-center justify-center">
            {showPreview && (
              <>
                {(() => {
                  // Get file extension from URL or content type
                  const getFileExtension = (url: string) => {
                    const urlWithoutQuery = url.split('?')[0];
                    return urlWithoutQuery.split('.').pop()?.toLowerCase() || '';
                  };

                  // Check if URL is valid
                  if (!showPreview.url) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-red-500 mb-4">Error: Document URL is missing</p>
                      </div>
                    );
                  }

                  const fileExtension = getFileExtension(showPreview.url);
                  logger.info('Document preview:', {
                    url: showPreview.url,
                    type: showPreview.document_type || showPreview.type,
                    fileExtension
                  });

                  // Handle image files
                  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
                    return (
                      <div className="relative w-full max-h-[70vh] overflow-auto">
                        <img 
                          src={showPreview.url} 
                          alt={`Preview of ${formatDocumentType(showPreview.document_type || showPreview.type)}`}
                          className="max-w-full h-auto object-contain mx-auto"
                          onError={(e) => {
                            logger.error('Image failed to load:', {
                              url: showPreview.url,
                              error: e
                            });
                            toast.error('Failed to load image');
                          }}
                        />
                      </div>
                    );
                  }

                  // Handle PDF files
                  if (fileExtension === 'pdf') {
                    return (
                      <div className="w-full h-[70vh]">
                        <object
                          data={showPreview.url}
                          type="application/pdf"
                          className="w-full h-full"
                        >
                          <iframe
                            src={`https://docs.google.com/viewer?url=${encodeURIComponent(showPreview.url)}&embedded=true`}
                            className="w-full h-full border-0"
                            title={`PDF Preview of ${formatDocumentType(showPreview.document_type || showPreview.type)}`}
                          />
                        </object>
                      </div>
                    );
                  }

                  // For non-previewable files
                  return (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">
                        This file type cannot be previewed directly
                      </p>
                      <div className="flex flex-col items-center gap-4">
                        <Button
                          variant="outline"
                          onClick={() => window.open(showPreview.url, '_blank')}
                        >
                          Open in New Tab
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = showPreview.url;
                            a.download = `${formatDocumentType(showPreview.document_type || showPreview.type)}.${fileExtension}`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                        >
                          Download File
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 