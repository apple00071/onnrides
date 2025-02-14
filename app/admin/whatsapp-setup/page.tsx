'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function WhatsAppSetupPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/admin/login');
            return;
        }
        
        if (status === 'authenticated' && session?.user?.role !== 'admin') {
            router.push('/');
            return;
        }
    }, [status, session, router]);

    const handleInitialize = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/whatsapp/init', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });
            
            // First check if response is empty
            const responseText = await response.text();
            if (!responseText) {
                console.error('Empty response received');
                throw new Error('Empty response from server');
            }

            // Try to parse the response as JSON
            let data;
            try {
                data = JSON.parse(responseText);
                console.log('Response data:', data); // For debugging
            } catch (parseError) {
                console.error('Failed to parse response:', responseText);
                throw new Error('Invalid response format from server');
            }
            
            if (!response.ok) {
                if (response.status === 401) {
                    toast.error('Unauthorized. Please log in again.');
                    router.push('/admin/login');
                    return;
                }
                throw new Error(data.error || 'Failed to initialize WhatsApp service');
            }

            if (data.success) {
                toast.success(data.message || 'WhatsApp service initialized. Check server logs for QR code.');
            } else {
                toast.error(data.error || 'Failed to initialize WhatsApp service');
            }
        } catch (error) {
            console.error('WhatsApp initialization error:', error);
            toast.error(error instanceof Error ? error.message : 'Error initializing WhatsApp service');
        } finally {
            setLoading(false);
        }
    };

    if (status === 'loading' || !session) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    // Only render for authenticated admin users
    if (status !== 'authenticated' || session?.user?.role !== 'admin') {
        return null;
    }

    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle>WhatsApp Service Setup</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                            <div className="flex">
                                <div className="ml-3">
                                    <p className="text-sm text-yellow-700">
                                        To set up WhatsApp integration:
                                        <ol className="list-decimal ml-5 mt-2 space-y-1">
                                            <li>Click the Initialize button below</li>
                                            <li>Check your server logs for the QR code</li>
                                            <li>Scan the QR code with WhatsApp on your phone</li>
                                            <li>The service will be ready once authentication is complete</li>
                                        </ol>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleInitialize}
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Initializing...
                                </>
                            ) : (
                                'Initialize WhatsApp Service'
                            )}
                        </Button>

                        <div className="mt-4 text-sm text-gray-500">
                            <p>Note: After scanning the QR code, the WhatsApp service will be linked to your phone number. Make sure to use the business phone number intended for sending notifications.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 