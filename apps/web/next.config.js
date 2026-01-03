/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@family-video/shared'],
  output: 'standalone',
};

module.exports = nextConfig;
