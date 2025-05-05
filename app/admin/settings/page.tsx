'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { SETTINGS } from '@/lib/settings';
import { redirectToLogin } from '@/lib/auth-utils';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirectToLogin();
    }
  }, [status]);

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      initializeAndFetchSettings();
    }
  }, [status, isAdmin]);

  const initializeAndFetchSettings = async () => {
    try {
      setLoading(true);
      
      // Initialize settings
      await fetch('/api/settings/initialize');
      
      // Fetch current settings
      const [maintenanceResponse, gstResponse] = await Promise.all([
        fetch('/api/settings/maintenance'),
        fetch('/api/settings?key=gst_enabled')
      ]);
      
      const maintenanceData = await maintenanceResponse.json();
      const gstData = await gstResponse.json();
      
      if (maintenanceData.success) {
        setMaintenanceMode(maintenanceData.maintenance);
      }
      
      if (gstData.success && gstData.data) {
        setGstEnabled(gstData.data.value === 'true');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const handleMaintenanceModeChange = async (checked: boolean) => {
    try {
      const response = await fetch('/api/settings/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: checked,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMaintenanceMode(checked);
        toast.success(checked ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
      } else {
        toast.error(data.error || 'Failed to update maintenance mode');
      }
    } catch (error) {
      toast.error('Error updating maintenance mode');
      console.error('Error updating maintenance mode:', error);
    }
  };

  const handleGSTChange = async (checked: boolean) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'gst_enabled',
          value: String(checked)
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setGstEnabled(checked);
        toast.success(checked ? 'GST enabled' : 'GST disabled');
      } else {
        toast.error(data.error || 'Failed to update GST setting');
      }
    } catch (error) {
      toast.error('Error updating GST setting');
      console.error('Error updating GST setting:', error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-gray-600">
              You do not have permission to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Site Settings</CardTitle>
          <CardDescription>
            Manage your site settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between py-4 px-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="space-y-1">
              <Label htmlFor="maintenance-mode" className="text-base font-medium">Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, only admins can access the site
              </p>
            </div>
            <Switch
              id="maintenance-mode"
              checked={maintenanceMode}
              onCheckedChange={handleMaintenanceModeChange}
              className="data-[state=checked]:bg-orange-500 data-[state=unchecked]:bg-gray-200"
            />
          </div>

          <div className="flex items-center justify-between py-4 px-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="space-y-1">
              <Label htmlFor="gst-enabled" className="text-base font-medium">GST</Label>
              <p className="text-sm text-muted-foreground">
                Enable or disable GST calculation for bookings
              </p>
            </div>
            <Switch
              id="gst-enabled"
              checked={gstEnabled}
              onCheckedChange={handleGSTChange}
              className="data-[state=checked]:bg-orange-500 data-[state=unchecked]:bg-gray-200"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 