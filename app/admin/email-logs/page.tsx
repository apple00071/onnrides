'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils/time-formatter';

interface EmailLog {
    id: string;
    recipient: string;
    subject: string;
    message_content: string;
    booking_id: string | null;
    status: string;
    error: string | null;
    message_id: string | null;
    created_at: string;
    vehicle_name: string | null;
}

interface PaginationData {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
}

export default function EmailLogsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [logs, setLogs] = useState<EmailLog[]>([]);
    const [pagination, setPagination] = useState<PaginationData>({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 20
    });
    const [loading, setLoading] = useState(true);
    const [resending, setResending] = useState<string | null>(null);

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
            const response = await fetch(`/api/admin/email-logs?page=${page}`);
            const data = await response.json();

            if (data.success) {
                setLogs(data.data);
                setPagination(data.pagination);
            } else {
                toast.error('Failed to fetch email logs');
            }
        } catch (error) {
            toast.error('Error fetching email logs');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchLogs(newPage);
        }
    };

    const handleResendEmail = async (logId: string) => {
        try {
            setResending(logId);
            const response = await fetch('/api/admin/email-logs/resend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ logId }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Email resent successfully');
                // Refresh the logs to show the new entry
                fetchLogs(pagination.currentPage);
            } else {
                toast.error(data.message || 'Failed to resend email');
            }
        } catch (error) {
            toast.error('Error resending email');
        } finally {
            setResending(null);
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
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!logs) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                No email logs found
            </div>
        );
    }

    return (
        <div className="w-full py-8">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Email Logs</CardTitle>
                    <CardDescription>History of all emails sent through the platform</CardDescription>
                </CardHeader>
                <div>
                    <div className="hidden md:block">
                        <table className="w-full table-auto">
                            <thead className="bg-gray-50 text-[10px] uppercase text-gray-400 font-semibold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 text-left">To</th>
                                    <th className="px-6 py-4 text-left">Subject</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-center">Date</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-3 px-6 font-semibold text-gray-900 text-sm">{log.recipient}</td>
                                        <td className="py-3 px-6 text-xs text-gray-500 max-w-xs truncate font-medium">
                                            {log.subject}
                                        </td>
                                        <td className="py-3 px-6 text-center">
                                            {getStatusBadge(log.status)}
                                        </td>
                                        <td className="py-3 px-6 text-center text-xs font-medium text-gray-600">
                                            {formatDateTime(log.created_at)}
                                        </td>
                                        <td className="py-3 px-6 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleResendEmail(log.id)}
                                                disabled={resending === log.id}
                                                className="h-8 border-gray-200 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg text-xs font-semibold"
                                            >
                                                {resending === log.id ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <>
                                                        <Send className="h-3.5 w-3.5 mr-1.5" />
                                                        Resend
                                                    </>
                                                )}
                                            </Button>
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
                                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-tighter">Recipient</span>
                                        <p className="text-sm font-semibold text-gray-900 leading-none mt-0.5">{log.recipient}</p>
                                    </div>
                                    <div className="text-right">
                                        {getStatusBadge(log.status)}
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-tighter">Subject</span>
                                    <p className="text-xs text-gray-800 font-semibold leading-snug mt-1">{log.subject}</p>
                                </div>
                                <div className="flex justify-between items-center gap-4">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase">{formatDateTime(log.created_at)}</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleResendEmail(log.id)}
                                        disabled={resending === log.id}
                                        className="h-8 flex-1 sm:flex-none border-gray-200 text-orange-600 font-semibold text-[10px] rounded-lg"
                                    >
                                        {resending === log.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Send className="h-3 w-3 mr-1.5" /> Resend</>}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4 w-full">
                    <div className="text-sm text-gray-500">
                        Total: {pagination.totalItems} items
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                            disabled={pagination.currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="py-2">
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
            </Card>
        </div>
    );
} 