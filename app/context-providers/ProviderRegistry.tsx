'use client';

import React from 'react';
import RazorpayProvider from '../(main)/providers/RazorpayProvider';
import ClientOnly from '../(main)/providers/ClientOnly';

interface ProviderRegistryProps {
    children: React.ReactNode;
    includeRazorpay?: boolean;
    includeClientOnly?: boolean;
}

export function ProviderRegistry({
    children,
    includeRazorpay = false,
    includeClientOnly = false
}: ProviderRegistryProps) {
    let content = children;

    if (includeRazorpay) {
        content = <RazorpayProvider>{content}</RazorpayProvider>;
    }

    if (includeClientOnly) {
        content = <ClientOnly>{content}</ClientOnly>;
    }

    return <>{content}</>;
}
