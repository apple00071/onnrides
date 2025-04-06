# Onnrides Responsive Design Guidelines

This document provides comprehensive guidelines for maintaining and implementing responsive design across the Onnrides website.

## Core Principles

1. **Mobile-First Approach**: Always design and develop for mobile devices first, then progressively enhance for larger screens.
2. **Responsive, Not Adaptive**: Use fluid layouts that respond to any screen size rather than fixed breakpoints.
3. **Touch-Friendly**: Design for touch interaction with appropriately sized tap targets (minimum 44×44px).
4. **Performance**: Keep mobile performance in mind—minimize JS, optimize images, and use code splitting.
5. **Testing**: Test on real devices whenever possible, not just device emulators.

## Tailwind Breakpoints

Onnrides uses Tailwind CSS for styling, which provides these breakpoints:

- `sm`: 640px and above
- `md`: 768px and above
- `lg`: 1024px and above
- `xl`: 1280px and above
- `2xl`: 1536px and above

Example usage:
```jsx
<div className="text-sm md:text-base lg:text-lg">Responsive text</div>
```

## Responsive Components

We've created several reusable responsive components to maintain consistency across the site:

### ResponsiveContainer

Use for consistent container widths with proper padding on different screens.

```jsx
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';

<ResponsiveContainer maxWidth="xl" padding={true}>
  Content goes here
</ResponsiveContainer>
```

### ResponsiveTable

Displays data as a traditional table on larger screens and as cards on mobile.

```jsx
import { ResponsiveTable } from '@/components/ui/ResponsiveTable';

const columns = [
  { header: 'Name', accessor: 'name', mobileLabel: 'Customer' },
  { header: 'Booking ID', accessor: 'id', mobileLabel: 'ID' },
  // More columns...
];

<ResponsiveTable 
  data={bookings} 
  columns={columns}
  keyField="id"
  onRowClick={handleRowClick}
/>
```

### ResponsiveCard

A flexible card component that adjusts its layout based on screen size.

```jsx
import { ResponsiveCard } from '@/components/ui/ResponsiveCard';

<ResponsiveCard
  title="Vehicle Details"
  subtitle="Honda Activa 6G"
  headerRight={<Button>Edit</Button>}
  footer={<div className="flex justify-end"><Button>Save</Button></div>}
>
  Card content here
</ResponsiveCard>
```

### ResponsiveImageGrid

A grid layout for images that adjusts columns based on screen size.

```jsx
import { ResponsiveImageGrid } from '@/components/ui/ResponsiveImageGrid';

<ResponsiveImageGrid
  images={vehicleImages}
  columns={{ sm: 1, md: 2, lg: 3 }}
  aspectRatio="16/9"
  onClick={openImageViewer}
/>
```

## Form Design Guidelines

1. **Stack form fields vertically** on mobile screens
2. **Use full width inputs** on mobile
3. **Increase touch targets** for better mobile usability
4. **Use collapsible sections** for long forms
5. **Show validation errors inline** below the field

Example implementation:

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label htmlFor="name">Full Name</Label>
    <Input 
      id="name" 
      className="h-10 text-base w-full" 
      placeholder="Enter your name"
    />
  </div>
  
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input 
      id="email"
      type="email" 
      className="h-10 text-base w-full"
      placeholder="Enter your email"
    />
  </div>
</div>
```

## Admin Dashboard Guidelines

The admin dashboard has special considerations:

1. **Collapsible sidebar menu** for mobile navigation
2. **Simplified data tables** that convert to card views on mobile
3. **Action buttons** consolidated into dropdown menus on small screens
4. **Dashboard widgets** that stack vertically on mobile screens
5. **Touch-friendly controls** for common admin actions

## Testing Responsive Design

Before deploying updates, test your changes on:

1. **Mobile devices**: iPhone SE (smallest common size), iPhone 12/13, Samsung Galaxy
2. **Tablets**: iPad Mini, iPad, iPad Pro
3. **Desktops**: 1366×768, 1920×1080
4. **Different browsers**: Chrome, Safari, Firefox, Edge

## Common Issues to Avoid

1. **Horizontal scrolling** on mobile pages
2. **Text that's too small** to read on mobile
3. **Touch targets that are too small** or too close together
4. **Large images** that aren't properly optimized
5. **Fixed positioning** that may cause issues on mobile
6. **Complex hover states** that don't translate to touch devices

## Best Practices

1. **Use relative units** (rem, %, vh/vw) instead of fixed pixels
2. **Test with content that breaks** (very long words, empty states)
3. **Optimize images** with proper sizing and formats (WebP, AVIF)
4. **Lazy load** images and components below the fold
5. **Use media queries thoughtfully** and sparingly
6. **Keep navigation simple** and accessible

By following these guidelines, we ensure Onnrides provides a consistent, high-quality user experience across all devices. 