'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import logger from '@/lib/logger';

export default function SettingsPage() {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch current maintenance mode status
    const fetchMaintenanceStatus = async () => {
      try {
        const response = await fetch('/api/admin/settings/maintenance');
        const data = await response.json();
        setIsMaintenanceMode(data.maintenanceMode);
      } catch (error) {
        logger.error('Error fetching maintenance status:', error);
      }
    };

    fetchMaintenanceStatus();
  }, []);

  const handleMaintenanceModeToggle = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/settings/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maintenanceMode: !isMaintenanceMode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update maintenance mode');
      }

      setIsMaintenanceMode(!isMaintenanceMode);
      toast.success(
        `Maintenance mode ${!isMaintenanceMode ? 'enabled' : 'disabled'} successfully`
      );
    } catch (error) {
      logger.error('Error updating maintenance mode:', error);
      toast.error('Failed to update maintenance mode');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Site Settings</h1>

      <div className="max-w-2xl bg-white rounded-lg shadow p-6">
        <div className="space-y-6">
          {/* Maintenance Mode Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Maintenance Mode</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  When enabled, all users will be redirected to the maintenance page.
                  Only administrators will have access to the site.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Switch
                  checked={isMaintenanceMode}
                  onCheckedChange={handleMaintenanceModeToggle}
                  disabled={isLoading}
                />
                <span className="text-sm font-medium">
                  {isMaintenanceMode ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Preview Button */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => window.open('/maintenance', '_blank')}
            >
              Preview Maintenance Page
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 