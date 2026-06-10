import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://wanderlustwonderer.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/api", "/chat", "/portal", "/login", "/signup", "/confirm-email"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
