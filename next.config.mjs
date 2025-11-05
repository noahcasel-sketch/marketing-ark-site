/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don’t fail the build on type or lint errors while we finish setup
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  experimental: {
    serverActions: { allowedOrigins: ["*"] }
  }
};

export default nextConfig;
