'use client';

import React from 'react';
import { Container } from '@/components/layout/Container';
import AdminNav from './AdminNav';

interface AdminDashboardLayoutProps {
  children: React.ReactNode;
}

export default function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav />
      <div className="pt-16">
        <Container as="main" className="py-6">
          {children}
        </Container>
      </div>
    </div>
  );
} 