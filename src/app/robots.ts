import type { MetadataRoute } from "next";
import { absoluteUrl, SITE_URL_IS_PLACEHOLDER } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // With no real address configured, every URL this build emits points at
  // localhost. Inviting crawlers in to collect them helps nobody.
  if (SITE_URL_IS_PLACEHOLDER) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        // Private to one customer, or behind a password. The pages also carry
        // noindex themselves — this is the belt to that pair of braces.
        "/admin",
        "/cart",
        "/checkout",
        "/order/",
        "/styleguide",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
