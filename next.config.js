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
      
      try {
        const TerserPlugin = require('terser-webpack-plugin');
        if (!config.optimization.minimizer) {
          config.optimization.minimizer = [];
        }
        
        config.optimization.minimizer.push(
          new TerserPlugin({
            terserOptions: {
              compress: {
                drop_console: false, // Don't remove all console calls
                pure_funcs: ['console.log', 'console.info', 'console.debug'] // Only remove specific console methods
              },
              format: {
                comments: false,
              },
            },
          })
        );
      } catch (error) {
        console.warn('Warning: terser-webpack-plugin not found. Skipping console removal optimization.');
      }
    }

    // Basic fallbacks that don't require polyfills
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Try to add polyfill fallbacks if available
    try {
      config.resolve.fallback = {
        ...config.resolve.fallback,
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
    } catch (error) {
      console.warn('Warning: Some polyfills not found. This is normal in server environment.');
    }

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