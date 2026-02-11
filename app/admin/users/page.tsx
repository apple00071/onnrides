'use client';

import { useState, useEffect } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { columns, type User } from './columns';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/admin/DeleteConfirmationDialog';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/admin/LoadingSkeletons';

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-xl border shadow-sm gap-4">
        <div className="hidden md:block">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">User Management</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage user accounts and details</p>
        </div>
        <div className="flex justify-between items-center w-full sm:w-auto gap-3">
          <div className="md:hidden text-sm font-medium text-gray-500">
            {users.length} Users
          </div>
          <Button
            variant="destructive"
            className="flex items-center gap-2 h-10 px-4 rounded-xl shadow-sm"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Clear All Users</span>
            <span className="sm:hidden">Clear All</span>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-6">
          {loading ? (
            <TableSkeleton rows={10} />
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
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <DataTable
                  columns={columns}
                  data={users}
                  searchKey="name"
                  searchPlaceholder="Search users..."
                  onSearch={handleSearchChange}
                />
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                <div className="mb-4">
                  <DataTable
                    columns={[]}
                    data={[]}
                    searchKey="name"
                    searchPlaceholder="Search users..."
                    onSearch={handleSearchChange}
                  />
                </div>
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 leading-tight">{user.name}</h3>
                          <p className="text-xs text-gray-500 font-medium mt-0.5">{user.email}</p>
                        </div>
                        <Badge className={`${user.status === 'blocked' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'} font-bold uppercase text-[9px] px-1.5 py-0`}>
                          {user.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Phone</span>
                          <p className="text-sm text-gray-800 font-medium leading-tight">{user.phone || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Role</span>
                          <p className="text-sm text-gray-800 font-bold leading-tight capitalize">{user.role}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-gray-50">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9 text-xs font-bold border-gray-200 rounded-lg"
                          onClick={() => window.location.href = `/admin/users/${user.id}`}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9 text-xs font-bold border-gray-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg"
                        >
                          {user.status === 'blocked' ? 'Unblock' : 'Block'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center p-4 border-t mt-4">
                  <div className="text-[11px] text-gray-500 font-medium hidden sm:block">
                    Showing {(pagination.currentPage - 1) * pagination.limit + 1} - {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of {pagination.totalCount} users
                  </div>
                  <div className="flex justify-between sm:justify-end w-full sm:w-auto space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 text-xs font-bold rounded-lg border-gray-200"
                      disabled={pagination.currentPage <= 1}
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                    >
                      Previous
                    </Button>
                    <div className="sm:hidden flex items-center text-[11px] font-bold text-gray-400 uppercase">
                      Page {pagination.currentPage} / {pagination.totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 text-xs font-bold rounded-lg border-gray-200"
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
        </div>
      </div>

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteAllUsers}
        title="Delete All Users?"
        description="Are you sure you want to delete ALL users except your own admin account? This action is irreversible and will delete all user-related data."
        confirmationText="DELETE ALL USERS"
        confirmLabel={deleteLoading ? "Deleting..." : "Yes, Delete All Users"}
      />
    </div>
  );
}