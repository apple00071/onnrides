/**
 * Standardized status and role badge colors for admin panel
 * Used across Bookings, Vehicles, and Users pages
 */

export const STATUS_BADGE_COLORS = {
    // Booking Statuses
    completed: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    active: 'bg-indigo-100 text-indigo-800 border-indigo-200',

    // Payment & Booking Types
    partially_paid: 'bg-orange-100 text-orange-800 border-orange-200',
    initiated: 'bg-blue-100 text-blue-800 border-blue-200',
    online: 'bg-primary/5 text-primary border-primary/20',
    offline: 'bg-blue-50 text-blue-700 border-blue-200',

    // Availability Statuses
    available: 'bg-green-100 text-green-800 border-green-200',
    unavailable: 'bg-gray-100 text-gray-800 border-gray-200',

    // User Roles
    admin: 'bg-blue-100 text-blue-800 border-blue-200',
    customer: 'bg-gray-100 text-gray-800 border-gray-200',
    user: 'bg-gray-100 text-gray-800 border-gray-200',
} as const;

export type StatusBadgeType = keyof typeof STATUS_BADGE_COLORS;

/**
 * Get badge color classes for a given status/role
 */
export function getBadgeColor(status: string): string {
    const normalizedStatus = status.toLowerCase() as StatusBadgeType;
    return STATUS_BADGE_COLORS[normalizedStatus] || STATUS_BADGE_COLORS.unavailable;
}
