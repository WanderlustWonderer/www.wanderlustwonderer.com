import type { MetadataRoute } from "next";

/** Keep private member areas out of search engines. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/account", "/chat", "/portal", "/book", "/admin", "/api"] },
    ],
  };
}
