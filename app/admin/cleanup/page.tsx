'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function CleanupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleCleanup = async () => {
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clean up test data');
      }

      toast.success('Successfully cleaned up test data');
      setShowConfirmation(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clean up test data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Clean Up Test Data</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="space-y-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>This action will permanently delete all test data including:</p>
                    <ul className="list-disc list-inside mt-2">
                      <li>All bookings</li>
                      <li>All payment records</li>
                    </ul>
                    <p className="mt-2">This action cannot be undone. Please make sure you have backed up any important data.</p>
                  </div>
                </div>
              </div>
            </div>

            {showConfirmation ? (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Final Warning</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>Are you absolutely sure you want to delete all test data? This action cannot be undone.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end mt-6">
              {showConfirmation && (
                <button
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                  className="mr-3 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                  disabled={isLoading}
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleCleanup}
                disabled={isLoading}
                className={`px-4 py-2 rounded-md text-sm font-medium text-white focus:outline-none ${
                  showConfirmation 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-yellow-600 hover:bg-yellow-700'
                } disabled:opacity-50`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                    Processing...
                  </div>
                ) : showConfirmation ? (
                  'Yes, Delete All Test Data'
                ) : (
                  'Clean Up Test Data'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 