import type { MetadataRoute } from "next";

import { publicEnv } from "@/lib/env/public";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      changeFrequency: "monthly",
      priority: 1,
      url: publicEnv.NEXT_PUBLIC_APP_URL,
    },
    {
      changeFrequency: "weekly",
      priority: 0.8,
      url: new URL("/projects", publicEnv.NEXT_PUBLIC_APP_URL).toString(),
    },
  ];
}
