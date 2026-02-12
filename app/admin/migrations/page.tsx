'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

export default function MigrationsPage() {
  const [loading, setLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [actionDetails, setActionDetails] = useState({ action: '', label: '' });
  const [forceReset, setForceReset] = useState(false);
  const [output, setOutput] = useState<string | null>(null);

  const runMigration = async (action: string, label: string) => {
    if (action === 'reset') {
      // Show confirmation dialog for dangerous operations
      setActionDetails({ action, label });
      setConfirmDialogOpen(true);
      return;
    }

    // Run it directly for safe operations
    await executeMigration(action);
  };

  const executeMigration = async (action: string) => {
    setLoading(true);
    setOutput(null);

    try {
      const response = await fetch('/api/admin/migrations/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          force: action === 'reset' ? forceReset : false,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Migration ${action} executed successfully`);
        setOutput(data.result.stdout || 'No output');
      } else {
        toast.error(data.error || 'Failed to execute migration');
        setOutput(data.details || 'Error: Unknown error occurred');
      }
    } catch (error) {
      toast.error('Failed to execute migration command');
      console.error('Error executing migration:', error);
      setOutput('Error: Could not execute migration command');
    } finally {
      setLoading(false);
      setConfirmDialogOpen(false);
    }
  };

  const handleConfirmAction = () => {
    executeMigration(actionDetails.action);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Database Migrations</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Operations</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Operations</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Check Migration Status</CardTitle>
                  <CardDescription>
                    View the current status of database migrations.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    onClick={() => runMigration('status', 'Check Status')}
                    disabled={loading}
                    className="ml-auto"
                  >
                    {loading ? 'Checking...' : 'Check Status'}
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Deploy Migrations</CardTitle>
                  <CardDescription>
                    Apply all pending migrations to the database. This is the safest option for
                    production environments.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    onClick={() => runMigration('deploy', 'Deploy Migrations')}
                    disabled={loading}
                    className="ml-auto"
                  >
                    {loading ? 'Deploying...' : 'Deploy Migrations'}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Reset Database</CardTitle>
                  <CardDescription className="text-red-500">
                    ⚠️ DANGER: This will drop all tables and recreate the database from scratch.
                    All data will be lost!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="force-reset"
                      checked={forceReset}
                      onCheckedChange={(checked) => setForceReset(checked as boolean)}
                    />
                    <label
                      htmlFor="force-reset"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Force reset (skip confirmation prompts)
                    </label>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => runMigration('reset', 'Reset Database')}
                    disabled={loading}
                    variant="destructive"
                    className="ml-auto"
                  >
                    {loading ? 'Resetting...' : 'Reset Database'}
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rollback Migration</CardTitle>
                  <CardDescription>
                    Mark the last migration as rolled back. Note: This doesn't actually revert the
                    changes - it only marks it in Prisma.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    onClick={() => runMigration('rollback', 'Rollback Migration')}
                    disabled={loading}
                    variant="outline"
                    className="ml-auto"
                  >
                    {loading ? 'Rolling Back...' : 'Rollback Migration'}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Command Output</CardTitle>
              <CardDescription>
                Results from the database migration operation will appear here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : output ? (
                <pre className="bg-gray-50 p-4 rounded-md h-64 overflow-auto text-sm whitespace-pre-wrap">
                  {output}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  No output to display. Run a migration command to see results.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {actionDetails.action === 'reset' && (
                <>
                  This will reset your entire database, dropping all tables and recreating them.
                  <span className="text-red-500 font-bold block mt-2">
                    All data will be permanently deleted.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              Yes, {actionDetails.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 