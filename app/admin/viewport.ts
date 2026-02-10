import { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Allow users to zoom for accessibility
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f26e24' },
    { media: '(prefers-color-scheme: dark)', color: '#f26e24' }
  ]
};

export default viewport; 