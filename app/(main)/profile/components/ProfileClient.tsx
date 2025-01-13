'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';

interface Profile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string | null;
  is_blocked: boolean | null;
  is_verified: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export default function ProfileClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch profile');
      }

      setProfile(data);
    } catch (error) {
      logger.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const formatRole = (role: string | null) => {
    if (!role) return 'User';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      {profile && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
              <div className="space-y-3">
                <p><span className="font-medium">Name:</span> {profile.name || 'Not provided'}</p>
                <p><span className="font-medium">Email:</span> {profile.email}</p>
                <p><span className="font-medium">Phone:</span> {profile.phone || 'Not provided'}</p>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-4">Account Status</h2>
              <div className="space-y-3">
                <p>
                  <span className="font-medium">Account Status:</span>{' '}
                  <span className={`${
                    profile.is_verified ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {profile.is_verified ? 'Verified' : 'Pending Verification'}
                  </span>
                </p>
                <p>
                  <span className="font-medium">Account Type:</span>{' '}
                  {formatRole(profile.role)}
                </p>
                <p>
                  <span className="font-medium">Member Since:</span>{' '}
                  {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 