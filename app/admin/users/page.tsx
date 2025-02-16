'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2 } from "lucide-react";
import { FaEye, FaBan, FaTrash } from 'react-icons/fa';
import logger from '@/lib/logger';
import { User } from '@/lib/types';
import UserDetailsModal from './components/UserDetailsModal';
import UserDocumentsModal from './components/UserDocumentsModal';
import { Button } from '@/components/ui/button';

interface Document {
  id: string;
  type: string;
  document_type: string;
  status: 'pending' | 'approved' | 'rejected';
  url: string;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [userDocuments, setUserDocuments] = useState<Document[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch users');
      }
      
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setUsers(data.data);
      } else {
        setUsers([]);
        toast.error('Invalid response format from server');
      }
    } catch (error) {
      logger.error('Error fetching users:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDocuments = async (userId: string) => {
    try {
      setLoadingDocuments(true);
      const response = await fetch(`/api/admin/users/${userId}/documents`);
      if (!response.ok) {
        throw new Error('Failed to fetch user documents');
      }
      const data = await response.json();
      setUserDocuments(data.documents);
    } catch (error) {
      logger.error('Error fetching user documents:', error);
      toast.error('Failed to load user documents');
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleUserUpdated = (updatedUser: User) => {
    setUsers(users.map(user => 
      user.id === updatedUser.id ? updatedUser : user
    ));
    setSelectedUser(updatedUser);
  };

  const handleViewDocuments = async (user: User) => {
    setSelectedUser(user);
    await fetchUserDocuments(user.id);
    setShowDocumentsModal(true);
  };

  const handleDocumentUpdate = async () => {
    if (selectedUser) {
      await fetchUserDocuments(selectedUser.id);
    }
  };

  const handleBlockUser = async (user: User) => {
    try {
      const response = await fetch(`/api/admin/users/${user.id}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked: !user.is_blocked }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update user status');
      }

      const updatedUser = await response.json();
      handleUserUpdated(updatedUser);
      
      // Notify user about being blocked
      await fetch(`/api/admin/users/${user.id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'blocked' }),
      });
      
      toast.success(`User ${user.is_blocked ? 'unblocked' : 'blocked'} successfully`);
    } catch (error) {
      logger.error('Error updating user status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      // First notify the user about being deleted
      await fetch(`/api/admin/users/${user.id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleted' }),
      });

      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete user');
      }

      setUsers(users.filter(u => u.id !== user.id));
      toast.success('User deleted successfully');
    } catch (error) {
      logger.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Users Management</h1>
      
      {users.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No users found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{user.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.documents ? (
                      <span className="text-sm">
                        {user.documents.approved}/{user.documents.total}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">0/0</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.bookings ? (
                      <span className="text-sm">
                        {user.bookings.completed}/{user.bookings.total}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">0/0</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewUser(user)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <FaEye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBlockUser(user)}
                      className={user.is_blocked ? 
                        "text-green-600 hover:text-green-900" : 
                        "text-orange-600 hover:text-orange-900"
                      }
                    >
                      <FaBan className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <FaTrash className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onUserUpdated={handleUserUpdated}
        />
      )}

      {selectedUser && (
        <UserDocumentsModal
          isOpen={showDocumentsModal}
          onClose={() => {
            setShowDocumentsModal(false);
            setSelectedUser(null);
            setUserDocuments([]);
          }}
          documents={userDocuments}
          userId={selectedUser.id}
          onDocumentUpdate={handleDocumentUpdate}
        />
      )}
    </div>
  );
} 