import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseRemotePatterns: NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
> = [];

if (supabaseUrl) {
  try {
    const parsedUrl = new URL(supabaseUrl);

    if (parsedUrl.protocol === "https:") {
      supabaseRemotePatterns.push(
        {
          hostname: parsedUrl.hostname,
          pathname: "/storage/v1/object/public/avatars/**",
          port: parsedUrl.port,
          protocol: "https",
        },
        {
          hostname: parsedUrl.hostname,
          pathname: "/storage/v1/object/public/project-images/**",
          port: parsedUrl.port,
          protocol: "https",
        },
      );
    }
  } catch {
    // Runtime environment validation reports malformed hosted-service values.
  }
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Supports one validated 10 MB project image plus multipart overhead,
      // while still covering avatar uploads.
      bodySizeLimit: "11mb",
    },
  },
  images: {
    remotePatterns: supabaseRemotePatterns,
  },
};

export default nextConfig;
