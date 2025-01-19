'use client'

import AdminDashboardLayout from '@/app/components/admin/AdminDashboardLayout'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminDashboardLayout>{children}</AdminDashboardLayout>
} 