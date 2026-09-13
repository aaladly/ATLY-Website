"use client";

import { formatCents } from "@/lib/pricing";
import { useDeliveryConfig } from "./StorefrontSettings";

/**
 * The New Jersey-only notice.
 *
 * The working agreement is explicit that this must be stated clearly BEFORE
 * checkout and never as a surprise at the address step. So it appears on the
 * home page, on the shop, and on every product page — not only in the footer.
 *
 * `tone="prominent"` is the banded version for the top of a page; `tone="inline"`
 * is a quieter line for inside a product panel.
 *
 * A client component so it can read the live delivery rules. It renders in
 * server pages and inside the cart alike, and the rate it quotes has to be the
 * rate the customer is actually charged — a stale "$5.99" here while the owner
 * has moved to $6.99 is the site lying about a price.
 */
export function DeliveryNotice({
  tone = "inline",
}: {
  tone?: "prominent" | "inline";
}) {
  const config = useDeliveryConfig();
  const standard = formatCents(config.standardCents);
  const stateOnly = config.allowedStateName;
  const freeCounty = config.freeCountyName;
  const freeLine = config.freeCounty.alwaysFree
    ? `Free delivery throughout ${freeCounty}.`
    : `Free delivery on orders of ${formatCents(config.freeCounty.thresholdCents)} or more in ${freeCounty}.`;

  if (tone === "prominent") {
    return (
      <aside className="border-y border-rule bg-ivory">
        <div className="mx-auto max-w-6xl px-gutter py-5 text-center">
          <p className="label-caps">Delivery area</p>
          <p className="mt-2 text-body-m">
            We currently deliver within <strong>{stateOnly} only</strong> — we
            are not shipping nationwide yet.
          </p>
          <p className="mt-1 text-body-s text-cocoa">
            {freeLine} {standard} elsewhere in {stateOnly}.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <p className="text-body-s text-cocoa">
      <strong className="text-cocoa-deep">{stateOnly} delivery only.</strong>{" "}
      {freeLine} {standard} elsewhere in {stateOnly}.
    </p>
  );
}
