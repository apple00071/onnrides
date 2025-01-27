/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost', 'res.cloudinary.com'],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: require.resolve('crypto-browserify'),
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
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  transpilePackages: ['lucide-react']
}

module.exports = nextConfig