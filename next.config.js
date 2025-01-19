/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false
      };
    }
    return config;
  },
  images: {
    domains: ['localhost'],
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
  output: 'standalone'
}

module.exports = nextConfig