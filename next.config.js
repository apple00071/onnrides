/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: true
  },
  transpilePackages: [
    'pg',
    'winston',
    'winston-daily-rotate-file',
    'fluent-ffmpeg',
    'whatsapp-web.js',
    'puppeteer',
    'qrcode-terminal'
  ],
  // Empty turbopack config to allow Next.js 16 build with webpack config
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        pg: false,
        'pg-native': false,
        'fluent-ffmpeg': false,
        'whatsapp-web.js': false,
        'puppeteer': false,
        'qrcode-terminal': false
      };
    }
    return config;
  },
  // Temporarily disable TypeScript and ESLint errors in production
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  }
};

module.exports = nextConfig;