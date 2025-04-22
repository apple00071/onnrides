'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { SETTINGS } from '@/lib/settings';
import { redirectToLogin } from '@/lib/auth-utils';

interface Setting {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSetting, setEditingSetting] = useState<Setting | null>(null);
  const [newValue, setNewValue] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirectToLogin();
    }
  }, [status]);

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      fetchSettings();
    }
  }, [status, isAdmin]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
      } else {
        toast.error('Failed to load settings');
      }
    } catch (error) {
      toast.error('Error loading settings');
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (setting: Setting) => {
    setEditingSetting(setting);
    setNewValue(setting.value);
    setIsDialogOpen(true);
  };

  const handleSaveSetting = async () => {
    if (!editingSetting) return;
    
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: editingSetting.key,
          value: newValue,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Setting updated successfully');
        fetchSettings(); // Refresh the list
        setIsDialogOpen(false);
      } else {
        toast.error(data.error || 'Failed to update setting');
      }
    } catch (error) {
      toast.error('Error updating setting');
      console.error('Error updating setting:', error);
    }
  };

  // Helper function to get a more readable name for settings keys
  const getSettingDisplayName = (key: string): string => {
    const displayNames: Record<string, string> = {
      [SETTINGS.MAINTENANCE_MODE]: 'Maintenance Mode',
      [SETTINGS.SITE_NAME]: 'Site Name',
      [SETTINGS.SUPPORT_EMAIL]: 'Support Email',
      [SETTINGS.SUPPORT_PHONE]: 'Support Phone',
      [SETTINGS.BOOKING_ADVANCE_PAYMENT_PERCENTAGE]: 'Booking Advance Payment (%)',
      [SETTINGS.BOOKING_GST_PERCENTAGE]: 'GST Percentage (%)',
      [SETTINGS.BOOKING_SERVICE_FEE_PERCENTAGE]: 'Service Fee Percentage (%)',
    };
    
    return displayNames[key] || key;
  };

  // Helper function to determine if a setting should be handled as a boolean
  const isBooleanSetting = (key: string): boolean => {
    return key === SETTINGS.MAINTENANCE_MODE;
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
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Access Denied</h1>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
          <CardDescription>
            Manage application-wide settings. Changes may require a page refresh to take effect.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>System configuration settings</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Setting</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    No settings found
                  </TableCell>
                </TableRow>
              ) : (
                settings.map((setting) => (
                  <TableRow key={setting.id}>
                    <TableCell className="font-medium">
                      {getSettingDisplayName(setting.key)}
                    </TableCell>
                    <TableCell>
                      {isBooleanSetting(setting.key) 
                        ? (setting.value === 'true' ? 'Enabled' : 'Disabled')
                        : setting.value}
                    </TableCell>
                    <TableCell>
                      {new Date(setting.updated_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditClick(setting)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Setting</DialogTitle>
            <DialogDescription>
              {editingSetting && (
                `Update the value for ${getSettingDisplayName(editingSetting.key)}`
              )}
            </DialogDescription>
          </DialogHeader>
          
          {editingSetting && (
            <>
              {isBooleanSetting(editingSetting.key) ? (
                <div className="grid gap-4 py-4">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={newValue === 'true' ? 'default' : 'outline'}
                      onClick={() => setNewValue('true')}
                    >
                      Enable
                    </Button>
                    <Button
                      variant={newValue === 'false' ? 'default' : 'outline'}
                      onClick={() => setNewValue('false')}
                    >
                      Disable
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Input
                      id="value"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      className="col-span-4"
                    />
                  </div>
                </div>
              )}
            </>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSetting}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 