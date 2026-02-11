'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils/time-formatter';

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
        <div className="w-full py-8">
            <Card className="w-full overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
                <CardHeader>
                    <CardTitle>WhatsApp Logs</CardTitle>
                    <CardDescription>History of all WhatsApp messages sent through the platform</CardDescription>
                </CardHeader>
                <div className="w-full">
                    <div className="hidden md:block">
                        <table className="w-full table-auto">
                            <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 text-left">Time</th>
                                    <th className="px-6 py-4 text-left">Phone</th>
                                    <th className="px-6 py-4 text-left">Message</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Error</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-3 px-6 text-xs font-medium text-gray-600">
                                            {formatDateTime(log.created_at)}
                                        </td>
                                        <td className="py-3 px-6 text-sm font-bold text-gray-800">{log.recipient}</td>
                                        <td className="py-3 px-6 text-xs text-gray-500 max-w-xs truncate font-medium">
                                            {log.message}
                                        </td>
                                        <td className="py-3 px-6 text-center">
                                            {getStatusBadge(log.status)}
                                        </td>
                                        <td className="py-3 px-6 text-right text-[10px] font-bold text-red-500 uppercase">
                                            {log.error || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {logs.map((log) => (
                            <div key={log.id} className="p-4 bg-white">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Recipient</span>
                                        <p className="text-sm font-bold text-gray-900 leading-none mt-0.5">{log.recipient}</p>
                                    </div>
                                    <div className="text-right">
                                        {getStatusBadge(log.status)}
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Message</span>
                                    <p className="text-xs text-gray-600 font-medium leading-relaxed mt-1 line-clamp-2">{log.message}</p>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                                    <span className="text-[9px] font-bold text-gray-400 uppercase">{formatDateTime(log.created_at)}</span>
                                    {log.error && <span className="text-[9px] font-black text-red-500 uppercase tracking-tight">Error: {log.error}</span>}
                                </div>
                            </div>
                        ))}
                        {logs.length === 0 && (
                            <div className="p-12 text-center text-gray-500 font-bold text-sm bg-gray-50/50">No logs found</div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 w-full">
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
        </div>
    );
} 