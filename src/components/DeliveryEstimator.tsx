"use client";

import { useMemo, useState, useId } from "react";
import { useCart } from "./useCart";
import { useDeliveryConfig, useVariantWeights } from "./StorefrontSettings";
import { quoteDelivery, totalPackagedWeightOz } from "@/lib/delivery";
import { BRAND } from "@/lib/catalog";
import { formatCents } from "@/lib/pricing";

/**
 * Live delivery estimate inside the cart.
 *
 * The brief is explicit that the delivery cost must move as the customer
 * changes quantities and ZIP, and that being outside New Jersey is told to
 * them here rather than sprung on them at the address step.
 *
 * The ZIP is held in component state only. It is not persisted: it is the
 * closest thing to personal data on this page, it is trivial to retype, and
 * Step 7 collects a full address properly.
 */
export function DeliveryEstimator() {
  const { cart, price } = useCart();
  // Rates, the free-delivery ZIP list and packaged weights all come from the
  // admin, so they are read here rather than imported from the bundle.
  const deliveryConfig = useDeliveryConfig();
  const weights = useVariantWeights();
  const [zip, setZip] = useState("");
  const [state, setState] = useState(deliveryConfig.allowedState);
  const zipId = useId();
  const stateId = useId();

  // Null while any SKU is unweighed, which is every SKU until the owner
  // weighs one. With no weight tiers configured that does not affect the
  // quote — see config/delivery.ts.
  const totalWeightOz = useMemo(
    () =>
      totalPackagedWeightOz(
        cart.lines.map((line) => ({
          quantity: line.quantity,
          packagedWeightOz: weights[line.variantId] ?? null,
        })),
      ),
    [cart.lines, weights],
  );

  const quote = useMemo(() => {
    if (zip.trim() === "") return null;
    return quoteDelivery(
      { address: { state, zip }, subtotalCents: price.subtotalCents, totalWeightOz },
      deliveryConfig,
    );
  }, [zip, state, price.subtotalCents, totalWeightOz, deliveryConfig]);

  const invalid = quote?.kind === "unavailable";

  return (
    <div>
      <h2 className="label-caps">Delivery</h2>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor={zipId} className="mb-2 block text-body-s text-cocoa">
            ZIP code
          </label>
          <input
            id={zipId}
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={10}
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="08822"
            aria-invalid={invalid || undefined}
            aria-describedby={quote ? `${zipId}-result` : undefined}
            className={`h-11 w-32 rounded-sm bg-ivory px-4 text-body-m ${
              invalid ? "border-2 border-error" : "border border-cocoa"
            }`}
          />
        </div>
        <div>
          <label htmlFor={stateId} className="mb-2 block text-body-s text-cocoa">
            State
          </label>
          <input
            id={stateId}
            type="text"
            autoComplete="address-level1"
            maxLength={2}
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase())}
            className="h-11 w-16 rounded-sm border border-cocoa bg-ivory px-4 text-center text-body-m uppercase"
          />
        </div>
      </div>

      {/* aria-live so the estimate is announced as it changes, not only seen. */}
      <div id={`${zipId}-result`} aria-live="polite" className="mt-4">
        {quote === null && (
          <p className="text-body-s text-cocoa">
            Enter a ZIP code to see delivery. We deliver within{" "}
            {deliveryConfig.allowedStateName} only.
          </p>
        )}

        {quote?.kind === "unavailable" && (
          <div className="border border-error bg-ivory p-4">
            <p className="text-body-m text-error">{quote.message}</p>
            {quote.reason === "out_of_state" && (
              <p className="mt-3 text-body-s text-cocoa">
                We are working on reaching further. Message us on{" "}
                <a
                  href={BRAND.social.instagram}
                  className="text-gold-deep"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </a>{" "}
                and we will let you know the moment we can deliver to you.
                {/* TODO: Step 7 replaces this with a proper email capture,
                    once there is a backend to store it in. An unwired form
                    here would be a dead end. */}
              </p>
            )}
          </div>
        )}

        {quote?.kind === "needs_weight" && (
          <p className="text-body-m">{quote.message}</p>
        )}

        {quote?.kind === "quoted" && (
          <>
            <p className="text-body-l">
              Delivery:{" "}
              <strong>
                {quote.isFree ? "Free" : formatCents(quote.costCents)}
              </strong>
            </p>
            <p className="mt-1 text-body-s text-cocoa">{quote.explanation}</p>
            {quote.centsToFreeDelivery !== null && (
              <p className="mt-1 text-body-s text-gold-deep">
                Add {formatCents(quote.centsToFreeDelivery)} more for free
                delivery in {deliveryConfig.freeCountyName}.
              </p>
            )}
            <p className="mt-4 flex items-baseline justify-between gap-4 border-t border-rule pt-4 text-body-m">
              <span>Order total</span>
              <strong className="text-display-s tabular-nums">
                {formatCents(price.subtotalCents + quote.costCents)}
              </strong>
            </p>
            <p className="mt-2 text-body-s text-cocoa">
              Before sales tax, which is added at checkout.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
