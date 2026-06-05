/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ghostmd/types', '@ghostmd/utils'],
  experimental: {
    serverComponentsExternalPackages: [],
  },
  images: {
    domains: [],
  },
};

module.exports = nextConfig;
