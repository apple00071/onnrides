'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface SessionStatus {
  success: boolean;
  sessionStatus: any;
  timestamp: string;
}

interface TestResults {
  sessionStatus: { success: boolean; data?: any; error?: string };
  textMessage: { success: boolean; phone?: string; error?: string };
  bookingConfirmation: { success: boolean; bookingId?: string; error?: string };
  paymentConfirmation: { success: boolean; paymentId?: string; error?: string };
}

export default function WhatsAppAdminPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResults | null>(null);

  // Form states
  const [testPhone, setTestPhone] = useState('919182495481');
  const [customMessage, setCustomMessage] = useState('Hello from OnnRides! This is a test message from the admin panel.');
  const [bookingData, setBookingData] = useState({
    customerName: 'Test Customer',
    vehicleModel: 'Honda Activa 6G',
    startDate: new Date().toLocaleDateString('en-IN'),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
    bookingId: 'ADMIN-TEST-' + Date.now(),
    totalAmount: '500'
  });

  // Check authentication
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!session?.user || session.user.role !== 'admin') {
      router.push('/auth/signin');
    }
  }, [session, authStatus, router]);

  // Load session status on mount
  useEffect(() => {
    checkSessionStatus();
  }, []);

  const checkSessionStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/whatsapp/wasender/status');
      const data = await response.json();
      setSessionStatus(data);

      if (data.success && data.sessionStatus) {
        toast.success('WaSender session status loaded');
      } else {
        toast.info('WaSender session status: Not connected');
      }
    } catch (error) {
      console.error('Status check error:', error);
      toast.error('Failed to check session status');
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestMessage = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/whatsapp/wasender/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text',
          phone: testPhone,
          message: customMessage
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Test message sent successfully!');
      } else {
        toast.error(`Failed to send message: ${data.error}`);
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send test message');
    } finally {
      setIsLoading(false);
    }
  };

  const sendBookingConfirmation = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/whatsapp/wasender/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'booking',
          phone: testPhone,
          data: bookingData
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Booking confirmation sent successfully!');
      } else {
        toast.error(`Failed to send booking confirmation: ${data.error}`);
      }
    } catch (error) {
      console.error('Send booking error:', error);
      toast.error('Failed to send booking confirmation');
    } finally {
      setIsLoading(false);
    }
  };

  const sendPaymentConfirmation = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/whatsapp/wasender/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment',
          phone: testPhone,
          data: {
            customerName: bookingData.customerName,
            bookingId: bookingData.bookingId,
            amount: bookingData.totalAmount,
            paymentId: 'PAY-' + Date.now()
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Payment confirmation sent successfully!');
      } else {
        toast.error(`Failed to send payment confirmation: ${data.error}`);
      }
    } catch (error) {
      console.error('Send payment error:', error);
      toast.error('Failed to send payment confirmation');
    } finally {
      setIsLoading(false);
    }
  };

  const sendPickupReminder = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/whatsapp/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pickup' })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Pickup reminders sent successfully!');
      } else {
        toast.error(`Failed to send pickup reminders: ${data.error}`);
      }
    } catch (error) {
      console.error('Send pickup reminder error:', error);
      toast.error('Failed to send pickup reminders');
    } finally {
      setIsLoading(false);
    }
  };

  const sendReturnReminder = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/whatsapp/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'return' })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Return reminders sent successfully!');
      } else {
        toast.error(`Failed to send return reminders: ${data.error}`);
      }
    } catch (error) {
      console.error('Send return reminder error:', error);
      toast.error('Failed to send return reminders');
    } finally {
      setIsLoading(false);
    }
  };

  const sendAllReminders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/whatsapp/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'all' })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('All reminders sent successfully!');
      } else {
        toast.error(`Failed to send reminders: ${data.error}`);
      }
    } catch (error) {
      console.error('Send all reminders error:', error);
      toast.error('Failed to send all reminders');
    } finally {
      setIsLoading(false);
    }
  };

  const runAllTests = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/whatsapp/wasender/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone })
      });

      const data = await response.json();

      if (data.success) {
        setTestResults(data.results);
        toast.success('All tests completed! Check results below.');
      } else {
        toast.error(`Tests failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Run tests error:', error);
      toast.error('Failed to run tests');
    } finally {
      setIsLoading(false);
    }
  };

  if (authStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">WhatsApp Testing Panel (WaSender)</h1>

      <div className="grid gap-6">
        {/* Session Status Card */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">WaSender Session Status</h2>
            <Button onClick={checkSessionStatus} disabled={isLoading} variant="outline">
              {isLoading ? 'Checking...' : 'Refresh Status'}
            </Button>
          </div>

          {sessionStatus ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  sessionStatus.success && sessionStatus.sessionStatus ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="font-medium">
                  {sessionStatus.success && sessionStatus.sessionStatus ? 'Connected' : 'Not Connected'}
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Last checked: {sessionStatus.timestamp}</p>
                <pre className="text-xs bg-white p-2 rounded border overflow-auto">
                  {JSON.stringify(sessionStatus.sessionStatus, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Click "Refresh Status" to check session status</p>
          )}
        </Card>

        {/* Test Configuration */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="testPhone">Test Phone Number</Label>
              <Input
                id="testPhone"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="919182495481"
              />
            </div>
            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={bookingData.customerName}
                onChange={(e) => setBookingData(prev => ({ ...prev, customerName: e.target.value }))}
              />
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button onClick={sendTestMessage} disabled={isLoading} className="w-full">
              Send Test Message
            </Button>
            <Button onClick={sendBookingConfirmation} disabled={isLoading} className="w-full">
              Send Booking Test
            </Button>
            <Button onClick={sendPaymentConfirmation} disabled={isLoading} className="w-full">
              Send Payment Test
            </Button>
            <Button onClick={runAllTests} disabled={isLoading} className="w-full" variant="outline">
              Run All Tests
            </Button>
          </div>
        </Card>

        {/* Automated Reminders */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Automated Reminders</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Button onClick={sendPickupReminder} disabled={isLoading} className="w-full" variant="secondary">
              Send Pickup Reminders
            </Button>
            <Button onClick={sendReturnReminder} disabled={isLoading} className="w-full" variant="secondary">
              Send Return Reminders
            </Button>
            <Button onClick={sendAllReminders} disabled={isLoading} className="w-full" variant="secondary">
              Send All Reminders
            </Button>
            <Button
              onClick={() => window.open('/api/cron/whatsapp-reminders', '_blank')}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              Test Cron Endpoint
            </Button>
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">Automated Reminder System</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Pickup reminders: Sent 24 hours before booking start time</li>
              <li>• Return reminders: Sent 24 hours before booking end time</li>
              <li>• Cron endpoint: <code>/api/cron/whatsapp-reminders</code></li>
              <li>• Manual trigger: <code>/api/whatsapp/reminders</code></li>
            </ul>
          </div>
        </Card>

        {/* Custom Message Testing */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Custom Message Testing</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customMessage">Custom Message</Label>
              <Textarea
                id="customMessage"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={4}
                placeholder="Enter your custom message here..."
              />
            </div>
            <Button onClick={sendTestMessage} disabled={isLoading}>
              Send Custom Message
            </Button>
          </div>
        </Card>

        {/* Booking Data Configuration */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Booking Test Data</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="vehicleModel">Vehicle Model</Label>
              <Input
                id="vehicleModel"
                value={bookingData.vehicleModel}
                onChange={(e) => setBookingData(prev => ({ ...prev, vehicleModel: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="bookingId">Booking ID</Label>
              <Input
                id="bookingId"
                value={bookingData.bookingId}
                onChange={(e) => setBookingData(prev => ({ ...prev, bookingId: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="totalAmount">Total Amount</Label>
              <Input
                id="totalAmount"
                value={bookingData.totalAmount}
                onChange={(e) => setBookingData(prev => ({ ...prev, totalAmount: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                value={bookingData.startDate}
                onChange={(e) => setBookingData(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                value={bookingData.endDate}
                onChange={(e) => setBookingData(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
        </Card>

        {/* Test Results */}
        {testResults && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(testResults).map(([testName, result]) => (
                <div key={testName} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${result.success ? 'bg-green-500' : 'bg-red-500'}`} />
                    <h3 className="font-medium capitalize">{testName.replace(/([A-Z])/g, ' $1')}</h3>
                  </div>
                  {result.success ? (
                    <p className="text-green-700 text-sm">✅ Success</p>
                  ) : (
                    <p className="text-red-700 text-sm">❌ {result.error || 'Failed'}</p>
                  )}
                  {result.phone && <p className="text-xs text-gray-500">Phone: {result.phone}</p>}
                  {result.bookingId && <p className="text-xs text-gray-500">Booking ID: {result.bookingId}</p>}
                  {result.paymentId && <p className="text-xs text-gray-500">Payment ID: {result.paymentId}</p>}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* API Information */}
        <Card className="p-6 bg-blue-50">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">API Information</h2>
          <div className="space-y-2 text-sm text-blue-700">
            <p><strong>Status Endpoint:</strong> GET /api/whatsapp/wasender/status</p>
            <p><strong>Send Message:</strong> POST /api/whatsapp/wasender/send</p>
            <p><strong>Run Tests:</strong> POST /api/whatsapp/wasender/test</p>
            <p><strong>API Key:</strong> {process.env.NEXT_PUBLIC_WASENDER_API_KEY ? 'Configured' : 'Not configured'}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}