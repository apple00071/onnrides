import { Metadata } from 'next';
import SettingsClient from './components/SettingsClient';

export const metadata: Metadata = {
  title: 'Settings | ONNRIDES',
  description: 'Manage your account settings and preferences',
};

export default function SettingsPage() {
  return <SettingsClient />;
} 