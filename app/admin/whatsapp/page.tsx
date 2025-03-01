'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';

export default function WhatsAppAdminPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Check authentication
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!session?.user || session.user.role !== 'admin') {
      router.push('/auth/signin');
    }
  }, [session, authStatus, router]);

  const initializeWhatsApp = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setConnectionStatus('connecting');
      
      const response = await fetch('/api/admin/whatsapp/init', {
        method: 'POST'
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Unauthorized. Please sign in again.');
          router.push('/auth/signin');
          return;
        }
        throw new Error(data.details || data.error || 'Failed to initialize WhatsApp');
      }
      
      if (data.qr) {
        setQrCode(data.qr);
        toast.success('Please scan the QR code with your WhatsApp');
      } else if (data.status === 'connected') {
        setConnectionStatus('connected');
        setQrCode(null);
        toast.success('WhatsApp is connected!');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize WhatsApp';
      setError(errorMessage);
      toast.error(errorMessage);
      logger.error('WhatsApp initialization error:', error);
      
      // Increment retry count
      setRetryCount(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/admin/whatsapp/status');
      const data = await response.json();
      
      setConnectionStatus(data.status);
      if (data.status === 'connected') {
        setQrCode(null);
        setError(null);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (error) {
      logger.error('Status check error:', error);
    }
  };

  // Check status periodically
  useEffect(() => {
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (authStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">WhatsApp Management</h1>

      <div className="grid gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500' :
              'bg-red-500'
            }`} />
            <span className="capitalize">{connectionStatus}</span>
          </div>
          
          <Button
            onClick={initializeWhatsApp}
            disabled={isLoading || connectionStatus === 'connected'}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Initializing...
              </>
            ) : (
              'Initialize WhatsApp'
            )}
          </Button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
              {retryCount < 3 && (
                <button 
                  onClick={() => initializeWhatsApp()}
                  className="mt-2 text-red-600 hover:text-red-800 font-medium"
                >
                  Try Again
                </button>
              )}
            </div>
          )}
        </Card>

        {qrCode && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Scan QR Code</h2>
            <div className="bg-white p-4 rounded-lg inline-block">
              <img
                src={`data:image/png;base64,${qrCode}`}
                alt="WhatsApp QR Code"
                className="max-w-[300px]"
              />
            </div>
            <p className="mt-4 text-sm text-gray-600">
              Open WhatsApp on your phone and scan this QR code to connect.
              The QR code will be valid for 2 minutes.
            </p>
          </Card>
        )}

        {connectionStatus === 'connected' && (
          <Card className="p-6 bg-green-50">
            <h2 className="text-xl font-semibold mb-4 text-green-800">WhatsApp Connected</h2>
            <p className="text-green-700">
              Your WhatsApp is successfully connected and ready to send messages.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
} 