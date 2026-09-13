"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "./useCart";
import { makeVariantId, ALLERGEN_LABEL, type Product } from "@/lib/catalog";
import {
  priceQuantity,
  findFreeUpgrade,
  formatCents,
  summarizeTiers,
} from "@/lib/pricing";
import { MAX_LINE_QUANTITY } from "@/lib/cart";
import { useTiers } from "./StorefrontSettings";

/**
 * Quantity stepper.
 *
 * Buttons rather than a bare number input: the primary customer is on a phone
 * at a market table, and a 44px target beats a spinner arrow. The input is kept
 * alongside so a keyboard or screen-reader user can type a quantity directly.
 */
function Stepper({
  label,
  value,
  onDelta,
  onSet,
  id,
}: {
  label: string;
  value: number;
  /** Relative change. The parent applies it against current state, so rapid
   *  taps cannot be lost to a stale captured value. */
  onDelta: (delta: number) => void;
  /** Absolute, for typed input where the customer states the number. */
  onSet: (next: number) => void;
  id: string;
}) {
  const clamp = (n: number) => Math.max(0, Math.min(MAX_LINE_QUANTITY, n));

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onDelta(-1)}
        disabled={value === 0}
        className="h-11 w-11 border border-cocoa text-body-l leading-none text-cocoa-deep transition-colors duration-200 hover:bg-cocoa-deep hover:text-cream disabled:cursor-not-allowed disabled:opacity-30"
        aria-label={`Remove one ${label}`}
      >
        &minus;
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_LINE_QUANTITY}
        value={value}
        onChange={(e) => onSet(clamp(Math.floor(Number(e.target.value) || 0)))}
        className="h-11 w-14 border-y border-cocoa bg-ivory text-center text-body-m"
        aria-label={`Quantity of ${label}`}
      />
      <button
        type="button"
        onClick={() => onDelta(1)}
        disabled={value >= MAX_LINE_QUANTITY}
        className="h-11 w-11 border border-cocoa text-body-l leading-none text-cocoa-deep transition-colors duration-200 hover:bg-cocoa-deep hover:text-cream disabled:cursor-not-allowed disabled:opacity-30"
        aria-label={`Add one ${label}`}
      >
        +
      </button>
    </div>
  );
}

export function AddToCart({ product }: { product: Product }) {
  const { add, hydrated } = useCart();
  const [selection, setSelection] = useState<Record<string, number>>({});
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const tiers = useTiers()[product.kind];
  const unit = product.kind === "bonbon" ? "piece" : "bar";

  const totalSelected = useMemo(
    () => Object.values(selection).reduce((sum, n) => sum + n, 0),
    [selection],
  );

  // Priced live from the same engine the cart and the server will use, so the
  // number here can never disagree with the number at checkout.
  const preview = useMemo(
    () => priceQuantity(totalSelected, tiers),
    [totalSelected, tiers],
  );
  const upgrade = useMemo(
    () => findFreeUpgrade(totalSelected, tiers),
    [totalSelected, tiers],
  );

  const clampQty = (n: number) => Math.max(0, Math.min(MAX_LINE_QUANTITY, n));

  const adjustFlavor = (variantId: string, delta: number) => {
    setSelection((current) => ({
      ...current,
      [variantId]: clampQty((current[variantId] ?? 0) + delta),
    }));
    setConfirmation(null);
  };

  const setFlavor = (variantId: string, quantity: number) => {
    setSelection((current) => ({ ...current, [variantId]: clampQty(quantity) }));
    setConfirmation(null);
  };

  const handleAdd = () => {
    if (totalSelected === 0) return;
    for (const [variantId, quantity] of Object.entries(selection)) {
      if (quantity > 0) add(variantId, quantity);
    }
    setConfirmation(
      `${totalSelected} ${unit}${totalSelected === 1 ? "" : "s"} added to your cart.`,
    );
    setSelection({});
  };

  return (
    <div>
      <h2 className="label-caps">Choose your {unit}s</h2>

      <ul className="mt-4 divide-y divide-rule border-y border-rule">
        {product.variants.map((variant) => {
          const id = makeVariantId(product.slug, variant.slug);
          const available = product.isAvailable && variant.isAvailable;
          return (
            <li
              key={variant.slug}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-4"
            >
              <div className="min-w-[10rem]">
                <label htmlFor={`qty-${id}`} className="text-body-m">
                  {variant.name}
                  {!available && (
                    <span className="ml-2 text-body-s text-cocoa">Sold out</span>
                  )}
                </label>
                <p className="text-body-s text-cocoa">
                  Contains{" "}
                  {variant.containsAllergens
                    .map((a) => ALLERGEN_LABEL[a].toLowerCase())
                    .join(", ")}
                </p>
              </div>
              {available ? (
                <Stepper
                  id={`qty-${id}`}
                  label={variant.name}
                  value={selection[id] ?? 0}
                  onDelta={(delta) => adjustFlavor(id, delta)}
                  onSet={(next) => setFlavor(id, next)}
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* Live pricing. aria-live so the running total is announced as the
          customer changes quantities rather than silently updating. */}
      <div aria-live="polite" className="mt-5 min-h-[3.5rem]">
        {totalSelected > 0 ? (
          <>
            <p className="text-body-l">
              {totalSelected} {unit}
              {totalSelected === 1 ? "" : "s"} —{" "}
              <strong>{formatCents(preview.totalCents)}</strong>
            </p>
            {preview.savingsCents > 0 && (
              <p className="mt-1 text-body-s text-gold-deep">
                {preview.bundles
                  .filter((b) => b.size > 1)
                  .map((b) => `${b.count > 1 ? `${b.count}× ` : ""}${b.label}`)
                  .join(" + ")}{" "}
                — you save {formatCents(preview.savingsCents)}
              </p>
            )}
            {upgrade && (
              <p className="mt-1 text-body-s text-cocoa">
                Add {upgrade.extraUnits} more and pay the same —{" "}
                {upgrade.newQuantity} {unit}s for{" "}
                {formatCents(preview.totalCents)}.
              </p>
            )}
          </>
        ) : (
          <p className="text-body-s text-cocoa">
            {summarizeTiers(tiers)}. Bundles apply automatically, and a{" "}
            {product.kind === "bonbon" ? "box" : "pair"} may mix flavors.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={!hydrated || totalSelected === 0}
        className="mt-5 inline-flex w-full items-center justify-center bg-cocoa-deep px-8 py-4 text-label uppercase text-cream transition-colors duration-200 hover:bg-cocoa disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
      >
        {hydrated ? "Add to cart" : "Loading…"}
      </button>

      {/* role=status so the confirmation is announced without stealing focus. */}
      <div role="status" aria-live="polite" className="mt-3 min-h-[1.5rem]">
        {confirmation && (
          <p className="text-body-s">
            {confirmation}{" "}
            <Link href="/cart" className="text-gold-deep">
              View cart
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
