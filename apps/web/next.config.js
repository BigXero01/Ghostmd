/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ghostmd/types', '@ghostmd/utils'],
  experimental: {
    // Prisma and bcryptjs use native binaries — keep them out of the webpack
    // bundle so Node.js loads them at runtime from node_modules.
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  images: {
    domains: [],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/api/webhooks/stripe',
        headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }],
      },
    ];
  },
};

module.exports = nextConfig;
