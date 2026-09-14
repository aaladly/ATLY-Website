import "server-only";

import { NJ_TAX } from "./tax";
import { MAX_LINE_QUANTITY } from "./cart";
import { getStorefrontSettings, indexVariants } from "./settings/resolve";
import { TERMS_LAST_UPDATED } from "./legal";
import type { CheckoutDeps } from "./checkout";

/**
 * Everything validateCheckout needs, built from the EFFECTIVE settings.
 *
 * Lives here rather than inside the checkout actions file so that the quote,
 * the charge, and anything else that has to produce an order all go through
 * one definition. A "use server" module can only export async functions, so a
 * shared factory could not have lived there anyway.
 *
 * This is where the admin's edits bite. A flavor marked sold out is refused
 * here even if a stale page still offers it, and the price charged is the
 * price the owner last saved — not the one compiled into the bundle.
 */
export async function checkoutDeps(
  makeReference: () => string,
): Promise<CheckoutDeps> {
  const settings = await getStorefrontSettings();
  const variants = indexVariants(settings.products);

  return {
    lookupVariant: (variantId: string) => {
      const found = variants.get(variantId);
      if (!found) return undefined;
      return {
        variantId,
        productName: found.product.name,
        variantName: found.variant.name,
        kind: found.product.kind,
        packagedWeightOz: found.variant.packagedWeightOz,
        isAvailable: found.product.isAvailable && found.variant.isAvailable,
      };
    },
    deliveryConfig: settings.delivery,
    tiersByKind: settings.tiers,
    taxConfig: NJ_TAX,
    makeReference,
    maxLineQuantity: MAX_LINE_QUANTITY,
    termsVersion: TERMS_LAST_UPDATED,
  };
}
