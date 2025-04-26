'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { columns, type User } from './columns';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        // Add timestamp to prevent caching
        const response = await fetch(`/api/admin/users?t=${Date.now()}`);
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    fetchUsers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Users</h1>
      </div>

      <div className="container-base p-6">
        <Card className="border-none">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="animate-pulse flex flex-col items-center">
                  <div className="h-6 w-24 bg-gray-200 rounded mb-4"></div>
                  <div className="h-32 w-full max-w-md bg-gray-200 rounded"></div>
                </div>
              </div>
            ) : error ? (
              <div className="py-12 text-center text-red-500">
                <h3 className="text-lg font-medium">Error loading users</h3>
                <p className="mt-2 text-sm">{error}</p>
              </div>
            ) : users.length === 0 ? (
              <div className="py-12 text-center">
                <h3 className="text-lg font-medium text-gray-700">No users found</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Users will appear here once they register through the app.
                </p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={users}
                searchKey="name"
                searchPlaceholder="Search users..."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 