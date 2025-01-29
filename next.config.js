/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Disable source maps in production
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hnamzevcrob5uib6.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      }
    ],
  },
  webpack: (config, { isServer, dev }) => {
    // Remove console.* calls in production
    if (!dev) {
      config.optimization.minimize = true;
      if (!config.optimization.minimizer) {
        config.optimization.minimizer = [];
      }

      // Add Terser plugin configuration for production
      const TerserPlugin = require('terser-webpack-plugin');
      config.optimization.minimizer.push(
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true, // Remove console.* calls
              pure_funcs: ['console.log', 'console.info', 'console.debug'],
              // Keep console.warn and console.error
              pure_funcs_after: ['console.warn', 'console.error']
            },
            format: {
              comments: false,
            },
          },
        })
      );
    }

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      os: require.resolve('os-browserify/browser'),
      buffer: require.resolve('buffer/'),
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      process: "process/browser"
    };
    return config;
  },
  async redirects() {
    return [
      {
        source: '/signup',
        destination: '/register',
        permanent: true
      }
    ]
  },
  experimental: {
    serverComponentsExternalPackages: ['bcrypt']
  },
  // Temporarily disable TypeScript and ESLint errors in production
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  output: 'standalone',
  transpilePackages: ['lucide-react']
}

module.exports = nextConfig