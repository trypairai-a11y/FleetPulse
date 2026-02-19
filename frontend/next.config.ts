import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["react-leaflet-cluster"],
  turbopack: {
    root: "..",
  },
};

export default nextConfig;
