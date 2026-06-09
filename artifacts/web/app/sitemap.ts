import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://next-tailwind-wanderlustwndr.replit.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/muse", "/collection", "/book", "/practice", "/tribute", "/faq", "/pricing", "/subscribe", "/terms", "/privacy"];
  const now = new Date();
  return routes.map((r) => ({
    url: `${BASE}${r}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: r === "" ? 1 : 0.7,
  }));
}
