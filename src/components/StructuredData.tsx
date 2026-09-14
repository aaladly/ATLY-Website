import { BRAND, ALLERGEN_LABEL, type Product } from "@/lib/catalog";
import type { BundleTier } from "@/lib/pricing";
import { BUSINESS, SITE_URL, absoluteUrl } from "@/lib/site";

/**
 * Structured data for search engines.
 *
 * The rule here is the same as everywhere else in this project: only facts we
 * actually have. Structured data is read by machines and surfaced as claims
 * with the business's name attached, so a guess here is a guess published at
 * scale.
 *
 * What is deliberately NOT emitted:
 *
 *   - LocalBusiness / FoodEstablishment. Those want a postal address, and this
 *     kitchen is a family home. Nobody has said they want that address on a
 *     map, and inventing one would be worse. See BUSINESS in lib/site.ts.
 *   - aggregateRating and review. There are no reviews. Marking up ratings
 *     that do not exist is both a lie and a manual penalty.
 *   - hasMerchantReturnPolicy and shippingDetails. The refund terms are still
 *     undecided (see /refunds); claiming a policy in markup that the policy
 *     page does not state would be the machine-readable version of a
 *     contradiction.
 */

/** JSON.stringify does not escape `<`, which is an XSS vector in a script tag. */
const serialize = (data: unknown): string =>
  JSON.stringify(data).replace(/</g, "\\u003c");

function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: BUSINESS.legalName,
        url: SITE_URL,
        description: BRAND.tagline,
        slogan: BRAND.secondaryTagline,
        // Real accounts, not placeholders.
        sameAs: [BRAND.social.instagram, BRAND.social.facebook],
        areaServed: {
          "@type": "State",
          name: BUSINESS.areaServed,
        },
      }}
    />
  );
}

export function ProductJsonLd({
  product,
  tiers,
}: {
  product: Product;
  tiers: readonly BundleTier[];
}) {
  const unit = tiers.find((tier) => tier.size === 1);
  const sellable =
    product.isAvailable && product.variants.some((variant) => variant.isAvailable);

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description,
        url: absoluteUrl(`/shop/${product.slug}`),
        brand: { "@type": "Brand", name: BUSINESS.legalName },
        category: "Chocolate",
        // The allergen tags are facts the owner stated. The ingredient lists
        // are not here because they do not exist yet, and a nutrition or
        // ingredient claim is the last place to approximate.
        material: product.variants
          .flatMap((variant) => variant.containsAllergens)
          .filter((value, index, all) => all.indexOf(value) === index)
          .map((allergen) => ALLERGEN_LABEL[allergen]),
        ...(unit
          ? {
              offers: {
                "@type": "Offer",
                // The single-unit price. Bundles are cheaper per piece, so
                // this is the honest ceiling rather than a headline the
                // customer might not reach.
                price: (unit.priceCents / 100).toFixed(2),
                priceCurrency: "USD",
                availability: sellable
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
                url: absoluteUrl(`/shop/${product.slug}`),
                seller: { "@id": `${SITE_URL}/#organization` },
                eligibleRegion: {
                  "@type": "State",
                  name: BUSINESS.areaServed,
                },
              },
            }
          : {}),
      }}
    />
  );
}
