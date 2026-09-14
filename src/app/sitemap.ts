import type { MetadataRoute } from "next";
import { PRODUCTS } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/site";

/**
 * The sitemap.
 *
 * Built from the catalog rather than typed out, so a product added later
 * appears without anyone remembering this file exists.
 *
 * Deliberately absent: /cart, /checkout, /order/[reference] and everything
 * under /admin. A cart is per-visitor, an order confirmation is private to one
 * customer, and the admin is behind a password — none of them have anything to
 * index, and listing an order reference in a public sitemap would be handing
 * them out. /styleguide is left out too: it is a working tool, not a page for
 * customers.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "monthly", priority: 1 },
    { url: absoluteUrl("/shop"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/about"), changeFrequency: "yearly", priority: 0.7 },
    { url: absoluteUrl("/allergens"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/refunds"), changeFrequency: "yearly", priority: 0.2 },
  ];

  for (const product of PRODUCTS) {
    entries.push({
      url: absoluteUrl(`/shop/${product.slug}`),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // No lastModified. These pages are prerendered, so a build-time date would
  // claim the content changed every time anything was deployed — which is a
  // signal crawlers are right to distrust.
  return entries;
}
