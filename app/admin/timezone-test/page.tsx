'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTimeIST } from '@/lib/utils/timezone';
import { formatDateTime } from '@/lib/utils/time-formatter';
import logger from '@/lib/logger';

// Simple AdminCard component
function AdminCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

export default function TimezoneTestPage() {
  const [testData, setTestData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientInfo, setClientInfo] = useState<any>({});
  
  useEffect(() => {
    // Get client-side information
    setClientInfo({
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateTimeFormat: new Date().toLocaleString(),
      now: new Date().toString(),
      nowISO: new Date().toISOString(),
      formatTest: formatLocalDate(new Date())
    });
  }, []);
  
  // Function to format a date on the client-side
  const formatLocalDate = (date: Date): string => {
    try {
      return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Error formatting date';
    }
  };
  
  const fetchTestData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/timezone-test', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch timezone test data');
      }
      const data = await res.json();
      setTestData(data);
    } catch (err) {
      logger.error('Error fetching timezone test data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Timezone Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <AdminCard title="Client-Side Information">
          <div className="space-y-2">
            <p><strong>Browser Timezone:</strong> {clientInfo.timeZone}</p>
            <p><strong>Current Time:</strong> {clientInfo.dateTimeFormat}</p>
            <p><strong>Raw Date:</strong> {clientInfo.now}</p>
            <p><strong>ISO Date:</strong> {clientInfo.nowISO}</p>
            <p><strong>Local Formatted (IST):</strong> {clientInfo.formatTest}</p>
            <p><strong>Library Formatted (IST):</strong> {formatDateTimeIST(new Date())}</p>
          </div>
        </AdminCard>
        
        <AdminCard title="Test Actions">
          <div className="space-y-4">
            <Button
              onClick={fetchTestData}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Loading...' : 'Fetch Server Timezone Data'}
            </Button>
            
            <div className="text-sm">
              <p className="text-gray-500">
                This test will check how dates are formatted on both the client and server.
                It can help identify any timezone inconsistencies between environments.
              </p>
            </div>
          </div>
        </AdminCard>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      )}
      
      {testData && (
        <div className="space-y-6">
          <AdminCard title="Server Metadata">
            <div className="space-y-2">
              <p><strong>Environment:</strong> {testData.metadata.serverEnvironment}</p>
              <p><strong>Server Timezone:</strong> {testData.metadata.systemTimeZone}</p>
              <p><strong>Vercel Region:</strong> {testData.metadata.vercelRegion}</p>
              <p><strong>Timestamp:</strong> {formatDateTime(testData.metadata.timestamp)}</p>
            </div>
          </AdminCard>
          
          <AdminCard title="Raw Dates">
            <div className="space-y-2">
              <p><strong>UTC:</strong> {testData.rawDates.nowUTC}</p>
              <p><strong>Local:</strong> {testData.rawDates.nowLocal}</p>
              <p><strong>IST:</strong> {testData.rawDates.nowIST}</p>
            </div>
          </AdminCard>
          
          <AdminCard title="Formatted Dates">
            <div className="space-y-2">
              <p><strong>formatDateTimeIST(now):</strong> {testData.formattedDates.now_formatDateTimeIST}</p>
              <p><strong>formatDateTimeIST(nowIST):</strong> {testData.formattedDates.nowIST_formatDateTimeIST}</p>
              <p><strong>formatDateTimeIST(testDate):</strong> {testData.formattedDates.testDate_formatDateTimeIST}</p>
              <p><strong>formatDateIST(now):</strong> {testData.formattedDates.now_formatDateIST}</p>
              <p><strong>formatTimeIST(now):</strong> {testData.formattedDates.now_formatTimeIST}</p>
              <p><strong>getNowISTString():</strong> {testData.formattedDates.nowISTString}</p>
            </div>
          </AdminCard>
        </div>
      )}
    </div>
  );
} 