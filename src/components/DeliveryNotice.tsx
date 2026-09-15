"use client";

import { deliveryPolicySummary } from "@/lib/delivery";
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
  const stateOnly = config.allowedStateName;
  // One sentence, built from the live rules. See deliveryPolicySummary.
  const policy = deliveryPolicySummary(config);

  if (tone === "prominent") {
    return (
      <aside className="border-y border-rule bg-ivory">
        <div className="mx-auto max-w-6xl px-gutter py-5 text-center">
          <p className="label-caps">Delivery area</p>
          <p className="mt-2 text-body-m">
            We currently deliver within <strong>{stateOnly} only</strong> — we
            are not shipping nationwide yet.
          </p>
          <p className="mt-1 text-body-s text-cocoa">{policy}</p>
        </div>
      </aside>
    );
  }

  return (
    <p className="text-body-s text-cocoa">
      <strong className="text-cocoa-deep">{stateOnly} delivery only.</strong>{" "}
      {policy}
    </p>
  );
}
