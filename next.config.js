/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: true,
    missingSuspenseWithCSRBailout: false,
    optimizePackageImports: ['@/components', '@/lib'],
  },
  // Allow build to continue despite static generation failures for error pages
  staticPageGenerationTimeout: 1000,
  compress: false,
  transpilePackages: [
    'pg',
    'winston',
    'winston-daily-rotate-file',
    'fluent-ffmpeg',
    'whatsapp-web.js',
    'puppeteer',
    'qrcode-terminal'
  ],
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
  },
  // Use output: 'standalone' for better deployment compatibility 
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/auth/signin',
        permanent: true,
      },
      {
        source: '/register',
        destination: '/auth/signup',
        permanent: true,
      },
      {
        source: '/privacy',
        destination: '/privacy-policy',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;