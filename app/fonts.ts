import localFont from 'next/font/local'

export const goodTimes = localFont({
  src: '../public/fonts/goodtimes.woff2',
  display: 'swap',
  variable: '--font-goodtimes',
  preload: true,
}) 