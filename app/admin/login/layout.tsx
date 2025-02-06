import { ReactNode } from 'react';

interface LoginLayoutProps {
  children: ReactNode;
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

export function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 