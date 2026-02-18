'use client';

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { getBadgeColor } from "@/lib/constants/status-colors";
import { formatDateTime } from "@/lib/utils/time-formatter";
import { MoreHorizontal, Eye, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/currency";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Booking = {
    id: string;
    booking_id: string;
    vehicle: {
        name: string;
        type: string;
    };
    user: {
        name: string;
        phone: string;
    };
    start_date: string;
    end_date: string;
    total_price: number;
    status: string;
    payment_status: string;
    booking_type: string;
    registration_number: string;
    pickup_location?: string | null;
};

// Helper to safely parse JSON location arrays or strings
const formatLocation = (location: string | null | undefined) => {
    if (!location) return "Not specified";
    try {
        // Handle double-encoded strings or raw JSON strings
        const cleaned = location.replace(/^"|"$/g, '').replace(/\\"/g, '"');
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
            return parsed.join(", ");
        }
        return cleaned;
    } catch (e) {
        // Fallback for non-JSON strings
        return location.replace(/^"|"$/g, '');
    }
};

export const columns: ColumnDef<Booking>[] = [
    {
        accessorKey: "booking_id",
        header: "Order ID",
        cell: ({ row }) => (
            <span className="text-sm font-medium text-gray-900">
                {row.getValue("booking_id")}
            </span>
        )
    },
    {
        accessorKey: "vehicle.name",
        header: "Vehicle",
        cell: ({ row }) => {
            const vehicle = row.original.vehicle;
            const regNo = row.original.registration_number;
            return (
                <div className="flex flex-col min-w-[140px]">
                    <span className="font-medium text-gray-900 leading-tight">{vehicle.name}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                        {regNo || 'No Reg No'}
                    </span>
                </div>
            );
        },
    },
    {
        accessorKey: "pickup_location",
        header: "Location",
        cell: ({ row }) => {
            const location = row.getValue("pickup_location") as string;
            return (
                <div className="max-w-[180px] text-sm text-gray-600">
                    {formatLocation(location)}
                </div>
            );
        },
    },
    {
        accessorKey: "user.name",
        header: "Customer",
        cell: ({ row }) => {
            const user = row.original.user;
            return (
                <div className="flex flex-col min-w-[140px]">
                    <span className="text-sm font-medium text-gray-900">{user.name || 'Unknown'}</span>
                    <span className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        {user.phone ? (
                            <>
                                {user.phone}
                            </>
                        ) : (
                            <span className="text-gray-400 italic">No Phone</span>
                        )}
                    </span>
                </div>
            );
        },
    },
    {
        accessorKey: "start_date",
        header: "Schedule",
        cell: ({ row }) => {
            const start = row.original.start_date;
            const end = row.original.end_date;

            // Format segments for better readability
            const formatTimePart = (dateStr: string) => {
                const formatted = formatDateTime(dateStr);
                const [date, time] = formatted.split(' ');
                return { date, time: time + ' ' + formatted.split(' ')[2] }; // Handles 12:00 PM format
            };

            const startParts = formatTimePart(start);
            const endParts = formatTimePart(end);

            return (
                <div className="flex flex-col space-y-2 py-1 min-w-[180px]">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <div className="flex flex-col leading-none">
                            <span className="text-[10px] uppercase font-medium text-gray-500">Pick-up</span>
                            <span className="text-xs text-gray-700">
                                {startParts.date} <span className="text-gray-400">at</span> {startParts.time}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                        <div className="flex flex-col leading-none">
                            <span className="text-[10px] uppercase font-medium text-gray-500">Return</span>
                            <span className="text-xs text-gray-700">
                                {endParts.date} <span className="text-gray-400">at</span> {endParts.time}
                            </span>
                        </div>
                    </div>
                </div>
            );
        },
    },
    {
        accessorKey: "total_price",
        header: "Amount",
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("total_price"));
            return (
                <div className="flex flex-col items-start gap-1">
                    <span className="font-medium text-gray-900">{formatCurrency(amount)}</span>
                </div>
            );
        },
    },
    {
        accessorKey: "booking_type",
        header: "Type",
        cell: ({ row }) => {
            const type = row.getValue("booking_type") as string;
            return (
                <Badge variant="outline" className={`capitalize font-medium ${type === 'online' ? 'border-primary/30 text-primary bg-primary/5' : 'border-blue-200 text-blue-700 bg-blue-50'}`}>
                    {type}
                </Badge>
            );
        },
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string;
            return (
                <Badge className={`${getBadgeColor(status)} px-2.5 py-0.5`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
            );
        },
    },
    {
        accessorKey: "payment_status",
        header: "Payment",
        cell: ({ row }) => {
            const paymentStatus = row.getValue("payment_status") as string;
            const bookingType = row.original.booking_type;
            const isCollectedOffline = bookingType === 'online' && paymentStatus === 'partially_paid';

            const label = isCollectedOffline
                ? '5% Online'
                : paymentStatus.charAt(0).toUpperCase() + paymentStatus.slice(1);

            return (
                <Badge
                    variant="outline"
                    className={`${getBadgeColor(paymentStatus)} ${isCollectedOffline ? 'bg-yellow-50' : ''}`}
                >
                    {label}
                </Badge>
            );
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const booking = row.original;
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => window.location.href = `/admin/bookings/${booking.booking_id}`}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(booking.booking_id)}>
                            <ExternalLink className="mr-2 h-4 w-4" /> Copy ID
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    },
];
