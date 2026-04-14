/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "logo.clearbit.com",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // API proxy handled by src/middleware.ts at runtime (supports Docker service names)
};

export default nextConfig;
