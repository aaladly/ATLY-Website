"use client";

import Link from "next/link";
import { useCart } from "./useCart";
import { findVariant } from "@/lib/catalog";
import { DeliveryNotice } from "./DeliveryNotice";
import { MAX_LINE_QUANTITY } from "@/lib/cart";
import {
  TIERS_BY_KIND,
  findFreeUpgrade,
  formatCents,
  type ProductKind,
} from "@/lib/pricing";

const KIND_LABEL: Record<ProductKind, { one: string; many: string }> = {
  bonbon: { one: "piece", many: "pieces" },
  bar: { one: "bar", many: "bars" },
};

function QuantityControl({
  variantId,
  quantity,
  label,
}: {
  variantId: string;
  quantity: number;
  label: string;
}) {
  const { setQuantity, adjust } = useCart();
  const clamp = (n: number) => Math.max(0, Math.min(MAX_LINE_QUANTITY, n));

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => adjust(variantId, -1)}
        className="h-11 w-11 border border-cocoa text-body-l leading-none transition-colors duration-200 hover:bg-cocoa-deep hover:text-cream"
        aria-label={`Remove one ${label}`}
      >
        &minus;
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_LINE_QUANTITY}
        value={quantity}
        onChange={(e) => setQuantity(variantId, clamp(Math.floor(Number(e.target.value) || 0)))}
        className="h-11 w-14 border-y border-cocoa bg-ivory text-center text-body-m"
        aria-label={`Quantity of ${label}`}
      />
      <button
        type="button"
        onClick={() => adjust(variantId, 1)}
        disabled={quantity >= MAX_LINE_QUANTITY}
        className="h-11 w-11 border border-cocoa text-body-l leading-none transition-colors duration-200 hover:bg-cocoa-deep hover:text-cream disabled:cursor-not-allowed disabled:opacity-30"
        aria-label={`Add one ${label}`}
      >
        +
      </button>
    </div>
  );
}

export function CartContents() {
  const { cart, price, hydrated, remove, clear, itemCount } = useCart();

  // Before the stored cart is read there is nothing truthful to show. A
  // skeleton avoids flashing "Your cart is empty" at someone who has six
  // boxes in it.
  if (!hydrated) {
    return (
      <div className="mx-auto max-w-4xl px-gutter py-section" aria-busy="true">
        <p className="label-caps">Loading your cart…</p>
        <div className="mt-8 space-y-4" aria-hidden="true">
          <div className="h-20 border border-rule bg-ivory" />
          <div className="h-20 border border-rule bg-ivory" />
        </div>
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <div className="mx-auto max-w-2xl px-gutter py-section text-center">
        <p className="label-caps">Your cart</p>
        <h1 className="mt-3 text-display-l">Nothing in it yet</h1>
        <p className="mx-auto mt-6 max-w-md text-body-l text-cocoa">
          Bon-bons are hand-filled to order and bars are moulded by hand. Pick a
          few and the bundle price is applied for you.
        </p>
        <div className="mt-9">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center bg-cocoa-deep px-8 py-4 text-label uppercase text-cream no-underline transition-colors duration-200 hover:bg-cocoa"
          >
            Browse the shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-gutter py-section">
      <p className="label-caps">Your cart</p>
      <h1 className="mt-3 text-display-xl">
        {itemCount} item{itemCount === 1 ? "" : "s"}
      </h1>

      {price.groups.map((group) => {
        const label = KIND_LABEL[group.kind];
        const tiers = TIERS_BY_KIND[group.kind];
        const upgrade = findFreeUpgrade(group.price.quantity, tiers);

        return (
          <section key={group.kind} className="mt-12">
            <h2 className="text-display-s">
              {group.price.quantity}{" "}
              {group.price.quantity === 1 ? label.one : label.many}
            </h2>

            <ul className="mt-4 divide-y divide-rule border-y border-rule">
              {group.allocations.map((line) => {
                const resolved = findVariant(line.variantId);
                if (!resolved) return null;
                return (
                  <li
                    key={line.variantId}
                    className="flex flex-wrap items-center justify-between gap-x-5 gap-y-4 py-5"
                  >
                    <div className="min-w-[9rem]">
                      <p className="text-body-m">{resolved.variant.name}</p>
                      <p className="text-body-s text-cocoa">
                        {resolved.product.name}
                      </p>
                    </div>

                    <QuantityControl
                      variantId={line.variantId}
                      quantity={line.quantity}
                      label={resolved.variant.name}
                    />

                    <div className="flex items-center gap-5">
                      <p className="text-body-m tabular-nums">
                        {formatCents(line.allocatedCents)}
                      </p>
                      <button
                        type="button"
                        onClick={() => remove(line.variantId)}
                        className="text-body-s text-cocoa underline underline-offset-4 hover:text-error"
                      >
                        Remove
                        <span className="sr-only"> {resolved.variant.name}</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* The bundle explanation. The brief asks for the saving to be
                shown explicitly, not merely applied. */}
            <div aria-live="polite">
              {group.price.savingsCents > 0 ? (
                <p className="mt-4 text-body-m text-gold-deep">
                  {group.price.bundles
                    .filter((b) => b.size > 1)
                    .map((b) => `${b.count > 1 ? `${b.count}× ` : ""}${b.label}`)
                    .join(" + ")}{" "}
                  — you save {formatCents(group.price.savingsCents)}
                </p>
              ) : (
                <p className="mt-4 text-body-s text-cocoa">
                  No bundle applies yet at this quantity.
                </p>
              )}

              {upgrade && (
                <p className="mt-2 text-body-s text-cocoa">
                  Add {upgrade.extraUnits} more {label.one}
                  {upgrade.extraUnits === 1 ? "" : "s"} and pay the same —{" "}
                  {upgrade.newQuantity} for {formatCents(group.price.totalCents)}.
                </p>
              )}
            </div>
          </section>
        );
      })}

      {/* ---- Totals ---- */}
      <div className="mt-section border-t border-rule-strong pt-6">
        <dl className="space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-body-m">Subtotal</dt>
            <dd className="text-display-s tabular-nums">
              {formatCents(price.subtotalCents)}
            </dd>
          </div>
          {price.savingsCents > 0 && (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-body-s text-gold-deep">Bundle savings</dt>
              <dd className="text-body-s text-gold-deep tabular-nums">
                &minus;{formatCents(price.savingsCents)}
              </dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-body-s text-cocoa">Delivery</dt>
            <dd className="text-body-s text-cocoa">
              Calculated at checkout
            </dd>
          </div>
        </dl>

        <div className="mt-8">
          {/* Checkout is Step 7. Disabled with the reason stated rather than a
              button that goes nowhere. */}
          <button
            type="button"
            disabled
            className="inline-flex w-full items-center justify-center bg-cocoa-deep px-8 py-4 text-label uppercase text-cream disabled:cursor-not-allowed disabled:opacity-40"
          >
            Checkout
          </button>
          <p className="mt-3 text-body-s text-cocoa">
            Checkout and delivery pricing open shortly.
          </p>
        </div>

        <div className="mt-8 border-t border-rule pt-6">
          <DeliveryNotice />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-6">
          <Link href="/shop" className="text-body-s text-cocoa-deep">
            Keep shopping
          </Link>
          <button
            type="button"
            onClick={clear}
            className="text-body-s text-cocoa underline underline-offset-4 hover:text-error"
          >
            Empty cart
          </button>
        </div>
      </div>

      {/* Quantities are also capped in lib/cart.ts, so a hand-edited stored
          cart cannot exceed this either. */}
      {cart.lines.some((l) => l.quantity >= MAX_LINE_QUANTITY) && (
        <p className="mt-8 border border-rule bg-ivory p-4 text-body-s">
          That is the most we can take for one flavor in a single order. For
          anything larger, please get in touch and we will arrange it.
        </p>
      )}
    </div>
  );
}
