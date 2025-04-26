'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-hot-toast';

export default function RecreateAdminPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);

  const handleRecreateAdmin = async () => {
    try {
      setIsLoading(true);
      setResult(null);
      
      const response = await fetch('/api/admin/recreate-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      setResult(data);
      
      if (response.ok && data.success) {
        toast.success(data.message || 'Admin user recreated successfully');
      } else {
        toast.error(data.error || 'Failed to recreate admin user');
      }
    } catch (error) {
      console.error('Error recreating admin:', error);
      setResult({
        success: false,
        message: 'Error recreating admin user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      toast.error('Error recreating admin user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Recreate Admin User</CardTitle>
          <CardDescription>
            Use this page to recreate the admin user with default credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm">
              This will create or update the admin user with the following credentials:
            </p>
            <div className="bg-gray-100 p-4 rounded text-sm font-mono">
              <div>Email: admin@onnrides.com</div>
              <div>Password: admin@123</div>
              <div>Role: admin</div>
            </div>
            {result && (
              <div className={`mt-4 p-4 rounded text-sm ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
                <p className="font-semibold">{result.success ? 'Success' : 'Error'}</p>
                <p>{result.message}</p>
                {result.details && <p className="text-xs mt-2 text-gray-600">{result.details}</p>}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleRecreateAdmin} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2"></div>
                <span>Processing...</span>
              </div>
            ) : 'Recreate Admin User'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 