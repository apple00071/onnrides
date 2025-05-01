import localFont from 'next/font/local'

export const goodTimes = localFont({
  src: [
    {
      path: '../public/fonts/Good Times Rg.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/GoodTimesLt-Regular.woff2',
      weight: '300',
      style: 'normal',
    }
  ],
  display: 'swap',
  variable: '--font-goodtimes',
  preload: true,
}) 