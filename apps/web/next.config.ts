import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@collabnow/db", "@collabnow/email", "@collabnow/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.ufs.sh",
      },
    ],
  },
};

export default nextConfig;
