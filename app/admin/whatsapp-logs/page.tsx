'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface WhatsAppLog {
    id: string;
    recipient: string;
    message: string;
    booking_id: string | null;
    status: string;
    error: string | null;
    message_type: string;
    chat_id: string | null;
    created_at: string;
    vehicle_name: string | null;
}

interface PaginationData {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
}

export default function WhatsAppLogsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [logs, setLogs] = useState<WhatsAppLog[]>([]);
    const [pagination, setPagination] = useState<PaginationData>({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 20
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (session?.user?.role !== 'admin') {
            router.push('/');
        } else {
            fetchLogs(1);
        }
    }, [status, session]);

    const fetchLogs = async (page: number) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/admin/whatsapp-logs?page=${page}`);
            const data = await response.json();

            if (data.success) {
                setLogs(data.data.logs);
                setPagination(data.data.pagination);
            } else {
                toast.error('Failed to fetch WhatsApp logs');
            }
        } catch (error) {
            toast.error('Error fetching WhatsApp logs');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchLogs(newPage);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: { [key: string]: string } = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            pending: 'bg-yellow-500'
        };

        return (
            <Badge className={variants[status.toLowerCase()] || 'bg-gray-500'}>
                {status}
            </Badge>
        );
    };

    if (status === 'loading' || loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle>WhatsApp Message Logs</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="py-2 px-4 text-left">Time</th>
                                    <th className="py-2 px-4 text-left">Recipient</th>
                                    <th className="py-2 px-4 text-left">Message</th>
                                    <th className="py-2 px-4 text-left">Vehicle</th>
                                    <th className="py-2 px-4 text-left">Type</th>
                                    <th className="py-2 px-4 text-left">Status</th>
                                    <th className="py-2 px-4 text-left">Error</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log) => (
                                    <tr key={log.id} className="border-b">
                                        <td className="py-2 px-4">
                                            {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                                        </td>
                                        <td className="py-2 px-4">{log.recipient}</td>
                                        <td className="py-2 px-4 max-w-md truncate">
                                            {log.message}
                                        </td>
                                        <td className="py-2 px-4">
                                            {log.vehicle_name || '-'}
                                        </td>
                                        <td className="py-2 px-4">
                                            {log.message_type}
                                        </td>
                                        <td className="py-2 px-4">
                                            {getStatusBadge(log.status)}
                                        </td>
                                        <td className="py-2 px-4 text-red-500">
                                            {log.error || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-gray-500">
                            Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
                            {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
                            {pagination.totalItems} entries
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                disabled={pagination.currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm">
                                Page {pagination.currentPage} of {pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                disabled={pagination.currentPage === pagination.totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 