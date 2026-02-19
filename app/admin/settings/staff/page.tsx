'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    Users,
    Plus,
    Shield,
    Trash2,
    Check,
    X,
    Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface StaffMember {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    permissions: Record<string, boolean>;
    created_at: string;
}

const AVAILABLE_PERMISSIONS = [
    { id: 'manage_bookings', label: 'Manage Bookings', description: 'View, edit, and process bookings' },
    { id: 'manage_vehicles', label: 'Manage Vehicles', description: 'Add, edit, and disable vehicles' },
    { id: 'view_reports', label: 'View Reports', description: 'Access standard reports' },
    { id: 'manage_finance', label: 'Manage Finance', description: 'View revenue and financial data' },
    { id: 'manage_settings', label: 'Manage Settings', description: 'Access system settings' },
];

export default function StaffManagementPage() {
    const router = useRouter();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        permissions: {} as Record<string, boolean>
    });

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/admin/staff');
            const result = await response.json();

            if (result.success) {
                setStaff(result.data);
            } else {
                toast.error(result.error || 'Failed to fetch staff');
            }
        } catch (error) {
            console.error('Error fetching staff:', error);
            toast.error('Failed to load staff members');
        } finally {
            setLoading(false);
        }
    };

    const handlePermissionChange = (permissionId: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [permissionId]: checked
            }
        }));
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            password: '',
            permissions: {}
        });
        setSelectedStaff(null);
    };

    const openAddModal = () => {
        resetForm();
        setIsAddModalOpen(true);
    };

    const openEditModal = (member: StaffMember) => {
        setSelectedStaff(member);
        setFormData({
            name: member.name,
            email: member.email,
            phone: member.phone,
            password: '', // Leave empty to keep unchanged
            permissions: member.permissions || {}
        });
        setIsEditModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email) {
            toast.error('Name and Email are required');
            return;
        }

        try {
            setSubmitting(true);

            const url = selectedStaff
                ? `/api/admin/staff/${selectedStaff.id}`
                : '/api/admin/staff';

            const method = selectedStaff ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                toast.success(selectedStaff ? 'Staff updated successfully' : 'Staff added successfully');
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                fetchStaff();
            } else {
                toast.error(result.error || 'Operation failed');
            }
        } catch (error) {
            console.error('Error saving staff:', error);
            toast.error('Failed to save staff member');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this staff member?')) return;

        try {
            const response = await fetch(`/api/admin/staff/${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();

            if (result.success) {
                toast.success('Staff member removed');
                fetchStaff();
            } else {
                toast.error(result.error || 'Failed to remove staff');
            }
        } catch (error) {
            console.error('Error deleting staff:', error);
            toast.error('Failed to delete staff member');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Staff Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage staff access and permissions</p>
                </div>
                <Button
                    onClick={openAddModal}
                    className="bg-primary hover:bg-primary/90 text-white font-bold"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Staff
                </Button>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Staff Member</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Permissions</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {staff.map((member) => (
                                <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <span className="font-bold text-primary">{member.name.charAt(0)}</span>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">{member.name}</p>
                                                <p className="text-xs text-gray-500">{member.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="uppercase">
                                            {member.role === 'admin' ? 'Super Admin' : 'Staff'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        {member.role === 'admin' ? (
                                            <span className="text-xs font-medium text-gray-500 italic">All Permissions</span>
                                        ) : (
                                            <div className="flex flex-wrap gap-1">
                                                {Object.entries(member.permissions || {})
                                                    .filter(([_, enabled]) => enabled)
                                                    .map(([key]) => (
                                                        <Badge key={key} variant="outline" className="text-[10px] bg-gray-50">
                                                            {key.replace('manage_', '').replace('view_', '')}
                                                        </Badge>
                                                    ))}
                                                {Object.values(member.permissions || {}).every(v => !v) && (
                                                    <span className="text-xs text-gray-400">No permissions</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {/* Prevent editing main admin if needed, strict check recommended on backend too */}
                                            <Button variant="ghost" size="sm" onClick={() => openEditModal(member)}>
                                                Edit
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDelete(member.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {staff.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        No staff members found. Add one to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                }
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{isEditModalOpen ? 'Edit Staff Member' : 'Add New Staff'}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Full Name</label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email Address</label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="john@example.com"
                                required
                                disabled={isEditModalOpen} // Prevent email change for now
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Phone</label>
                            <Input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+91 98765 43210"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                {isEditModalOpen ? 'New Password (leave blank to keep)' : 'Password'}
                            </label>
                            <Input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="••••••••"
                                required={!isEditModalOpen}
                            />
                        </div>

                        <div className="space-y-3 pt-4 border-t">
                            <h3 className="text-sm font-bold text-gray-900">Permissions</h3>
                            <div className="space-y-3">
                                {AVAILABLE_PERMISSIONS.map((perm) => (
                                    <div key={perm.id} className="flex items-start justify-between">
                                        <div className="space-y-0.5">
                                            <label className="text-sm font-medium block">{perm.label}</label>
                                            <p className="text-[10px] text-gray-500">{perm.description}</p>
                                        </div>
                                        <Switch
                                            checked={!!formData.permissions[perm.id]}
                                            onCheckedChange={(checked) => handlePermissionChange(perm.id, checked)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => {
                                setIsAddModalOpen(false);
                                setIsEditModalOpen(false);
                            }}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditModalOpen ? 'Save Changes' : 'Create Account'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
