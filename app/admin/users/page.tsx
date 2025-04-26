'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { columns, type User } from './columns';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'react-hot-toast';
import { Trash2 } from 'lucide-react';

interface PaginationData {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
    limit: 10
  });
  const [search, setSearch] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  async function fetchUsers(page = 1, search = '') {
    try {
      setLoading(true);
      // Add timestamp to prevent caching
      const response = await fetch(`/api/admin/users?page=${page}&limit=${pagination.limit}&search=${search}&t=${Date.now()}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();

      // Check if the data has the expected structure
      if (data && data.users) {
        // Transform the data to match the User type
        const formattedUsers = data.users.map((user: any) => ({
          ...user,
          status: user.is_blocked ? 'blocked' : 'active',
          created_at: user.created_at || new Date().toISOString()
        }));
        
        setUsers(formattedUsers);
        
        // Update pagination if available
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        console.error('Unexpected API response structure:', data);
        setError('Invalid response format from the server');
        setUsers([]);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }
  
  useEffect(() => {
    fetchUsers(pagination.currentPage, search);
  }, []);

  const handleSearchChange = (searchValue: string) => {
    setSearch(searchValue);
    fetchUsers(1, searchValue);
  };

  const handlePageChange = (newPage: number) => {
    fetchUsers(newPage, search);
  };

  const handleDeleteAllUsers = async () => {
    try {
      setDeleteLoading(true);
      
      const response = await fetch('/api/admin/users/delete-all', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success(`Successfully deleted ${data.deletedCount} users`);
        // Refresh the user list
        fetchUsers(1, '');
      } else {
        toast.error(data.error || 'Failed to delete users');
      }
    } catch (err) {
      console.error('Error deleting users:', err);
      toast.error('Error deleting users. Please try again.');
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmText('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex justify-between items-center">
        <h1 className="page-title">Users</h1>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Delete All Users
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete ALL users except 
                your admin account from the database.
                <div className="mt-4">
                  <p className="font-semibold text-destructive">Type "DELETE ALL USERS" to confirm:</p>
                  <input
                    type="text"
                    className="w-full mt-2 p-2 border border-gray-300 rounded"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE ALL USERS"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteConfirmText !== 'DELETE ALL USERS' || deleteLoading}
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteAllUsers();
                }}
                className="bg-destructive hover:bg-destructive/90 text-white"
              >
                {deleteLoading ? (
                  <div className="flex items-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                    Deleting...
                  </div>
                ) : (
                  'Yes, Delete All Users'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => fetchUsers(pagination.currentPage, search)}
                >
                  Try Again
                </Button>
              </div>
            ) : users.length === 0 ? (
              <div className="py-12 text-center">
                <h3 className="text-lg font-medium text-gray-700">No users found</h3>
                <p className="mt-2 text-sm text-gray-500">
                  {search ? `No results found for "${search}"` : "Users will appear here once they register through the app."}
                </p>
                {search && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setSearch('');
                      fetchUsers(1, '');
                    }}
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <>
                <DataTable
                  columns={columns}
                  data={users}
                  searchKey="name"
                  searchPlaceholder="Search users..."
                  onSearch={handleSearchChange}
                />
                
                {pagination.totalPages > 1 && (
                  <div className="flex justify-between items-center p-4 border-t">
                    <div className="text-sm text-gray-500">
                      Showing {(pagination.currentPage - 1) * pagination.limit + 1} - {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of {pagination.totalCount} users
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.currentPage <= 1}
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.currentPage >= pagination.totalPages}
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 