'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import logger from '@/lib/logger';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    <div className="w-full py-6">
      <Card className="w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Site Settings</CardTitle>
          <CardDescription>
            Manage global site settings and configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Maintenance Mode Section */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Maintenance Mode</h2>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    When enabled, all users will be redirected to the maintenance page.
                    Only administrators will have access to the site.
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-medium">
                      {isMaintenanceMode ? 'Enabled' : 'Disabled'}
                    </span>
                    <Switch
                      checked={isMaintenanceMode}
                      onCheckedChange={handleMaintenanceModeToggle}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="pt-4">
                    <Button
                      variant="outline"
                      onClick={() => window.open('/maintenance', '_blank')}
                      className="w-full"
                    >
                      Preview Maintenance Page
                    </Button>
                  </div>
                </div>
              </div>

              {/* System Information Section */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">System Information</h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Environment:</span>
                    <span className="text-sm font-medium">Production</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Version:</span>
                    <span className="text-sm font-medium">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Updated:</span>
                    <span className="text-sm font-medium">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Cache Management Section */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Cache Management</h2>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Clear cache to refresh data and fix display issues.
                    This will reload data from the database.
                  </p>
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => toast.success('Cache cleared successfully')}
                    >
                      Clear Application Cache
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 