'use client';

import { Toaster as Sonner } from 'sonner';
import { useTheme } from 'next-themes';

export const ToasterProvider = () => {
    const { theme } = useTheme();

    return (
        <Sonner
            theme={theme as 'light' | 'dark' | 'system'}
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast: "group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-950 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-lg dark:group-[.toaster]:bg-slate-950 dark:group-[.toaster]:text-slate-50 dark:group-[.toaster]:border-slate-800 backdrop-blur-md bg-opacity-80 dark:bg-opacity-80",
                    description: "group-[.toast]:text-slate-500 dark:group-[.toast]:text-slate-400 font-medium",
                    actionButton: "group-[.toast]:bg-slate-950 group-[.toast]:text-slate-50 dark:group-[.toast]:bg-slate-50 dark:group-[.toast]:text-slate-950",
                    cancelButton: "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-500 dark:group-[.toast]:bg-slate-800 dark:group-[.toast]:text-slate-400",
                    success: "group-[.toaster]:border-emerald-500/20 group-[.toaster]:bg-emerald-50/50 dark:group-[.toaster]:bg-emerald-950/20 group-[.toast]:text-emerald-600 dark:group-[.toast]:text-emerald-400",
                    error: "group-[.toaster]:border-rose-500/20 group-[.toaster]:bg-rose-50/50 dark:group-[.toaster]:bg-rose-950/20 group-[.toast]:text-rose-600 dark:group-[.toast]:text-rose-400",
                    warning: "group-[.toaster]:border-amber-500/20 group-[.toaster]:bg-amber-50/50 dark:group-[.toaster]:bg-amber-950/20 group-[.toast]:text-amber-600 dark:group-[.toast]:text-amber-400",
                    info: "group-[.toaster]:border-sky-500/20 group-[.toaster]:bg-sky-50/50 dark:group-[.toaster]:bg-sky-950/20 group-[.toast]:text-sky-600 dark:group-[.toast]:text-sky-400",
                },
            }}
            position="bottom-right"
            expand={true}
            richColors
            closeButton
        />
    );
};
