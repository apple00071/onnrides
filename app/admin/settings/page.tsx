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
import { SETTINGS } from '@/lib/settings-client';
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
        fetch('/api/settings?key=' + SETTINGS.MAINTENANCE_MODE),
        fetch('/api/settings?key=' + SETTINGS.GST_ENABLED)
      ]);
      
      const maintenanceData = await maintenanceResponse.json();
      const gstData = await gstResponse.json();
      
      if (maintenanceData.success && maintenanceData.data) {
        setMaintenanceMode(maintenanceData.data.value.toLowerCase() === 'true');
      }
      
      if (gstData.success && gstData.data) {
        setGstEnabled(gstData.data.value.toLowerCase() === 'true');
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
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: SETTINGS.MAINTENANCE_MODE,
          value: String(checked),
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

  const handleGstChange = async (checked: boolean) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: SETTINGS.GST_ENABLED,
          value: String(checked),
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

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
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
                Enable 18% GST on all bookings
              </p>
            </div>
            <Switch
              id="gst-enabled"
              checked={gstEnabled}
              onCheckedChange={handleGstChange}
              className="data-[state=checked]:bg-orange-500 data-[state=unchecked]:bg-gray-200"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 