/**
 * ATLY pricing engine — Schedule A.
 *
 * Pure and testable per the working agreement: no React, no database calls,
 * no clock reads. Every input is passed in.
 *
 * MONEY IS ALWAYS INTEGER CENTS. Never float. $2.00 is 200, not 2.0.
 *
 * Schedule A, approved by the owner:
 *   Bon-bons  $2.00 each · 3 for $5 · 10 for $15
 *             The 10-for-$15 rate is the FLOOR. Larger orders are multiples
 *             of it, never a deeper discount — a hundred bon-bons is a
 *             hundred times the handwork, so unit cost does not fall.
 *   Bars      $7.00 each · 2 for $10
 *
 * Both product lines may mix flavors freely, so bundles apply across the
 * whole quantity of a product kind rather than per flavor.
 */

export type ProductKind = "bonbon" | "bar";

/** One purchasable quantity at a fixed price. size 1 is the base unit price. */
export type BundleTier = {
  size: number;
  priceCents: number;
  /** Customer-facing, e.g. "3 for $5". */
  label: string;
};

/**
 * Tiers live here as the default, and in the pricing_rules table so the admin
 * can change them without a deploy (Step 9). Keep the two in agreement.
 */
export const BONBON_TIERS: readonly BundleTier[] = [
  { size: 1, priceCents: 200, label: "$2 each" },
  { size: 3, priceCents: 500, label: "3 for $5" },
  { size: 10, priceCents: 1500, label: "10 for $15" },
] as const;

export const BAR_TIERS: readonly BundleTier[] = [
  { size: 1, priceCents: 700, label: "$7 each" },
  { size: 2, priceCents: 1000, label: "2 for $10" },
] as const;

export const TIERS_BY_KIND: Record<ProductKind, readonly BundleTier[]> = {
  bonbon: BONBON_TIERS,
  bar: BAR_TIERS,
};

export type AppliedBundle = {
  size: number;
  priceCents: number;
  label: string;
  /** How many of this bundle were used. */
  count: number;
};

export type LinePrice = {
  quantity: number;
  totalCents: number;
  /** What the quantity would cost with no bundles, at the size-1 tier. */
  baseTotalCents: number;
  /** baseTotalCents - totalCents. Never negative. */
  savingsCents: number;
  /** Which bundles make up the total, largest size first. */
  bundles: AppliedBundle[];
};

/**
 * Cheapest way to buy exactly `quantity` units from the given tiers.
 *
 * Exact dynamic programming, not a greedy pass. Greedy happens to be correct
 * for Schedule A's numbers, but it is not correct in general for arbitrary
 * tiers, and the admin can edit tiers at runtime (Step 9) — so the engine
 * must stay correct for tier sets nobody has thought about yet.
 */
export function priceQuantity(
  quantity: number,
  tiers: readonly BundleTier[],
): LinePrice {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new RangeError(`quantity must be a non-negative integer, got ${quantity}`);
  }
  if (tiers.length === 0) {
    throw new RangeError("at least one tier is required");
  }

  const unit = tiers.find((t) => t.size === 1);
  if (!unit) {
    // Without a single-unit price some quantities are unreachable and the
    // customer-facing "you save" figure has nothing to compare against.
    throw new RangeError("tiers must include a size-1 tier");
  }
  for (const t of tiers) {
    if (!Number.isInteger(t.size) || t.size < 1) {
      throw new RangeError(`tier size must be a positive integer, got ${t.size}`);
    }
    if (!Number.isInteger(t.priceCents) || t.priceCents < 0) {
      throw new RangeError(`tier price must be a non-negative integer, got ${t.priceCents}`);
    }
  }

  const baseTotalCents = quantity * unit.priceCents;

  if (quantity === 0) {
    return { quantity: 0, totalCents: 0, baseTotalCents: 0, savingsCents: 0, bundles: [] };
  }

  // best[q] = cheapest cost for exactly q units; from[q] = tier index used last.
  const best = new Array<number>(quantity + 1).fill(Number.POSITIVE_INFINITY);
  const from = new Array<number>(quantity + 1).fill(-1);
  best[0] = 0;

  for (let q = 1; q <= quantity; q++) {
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      if (t.size > q) continue;
      const candidate = best[q - t.size] + t.priceCents;
      if (candidate < best[q]) {
        best[q] = candidate;
        from[q] = i;
      }
    }
  }

  // Reconstruct which bundles were used.
  const counts = new Map<number, AppliedBundle>();
  for (let q = quantity; q > 0; ) {
    const i = from[q];
    const t = tiers[i];
    const existing = counts.get(i);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(i, { size: t.size, priceCents: t.priceCents, label: t.label, count: 1 });
    }
    q -= t.size;
  }

  const bundles = [...counts.values()].sort((a, b) => b.size - a.size);
  const totalCents = best[quantity];

  return {
    quantity,
    totalCents,
    baseTotalCents,
    savingsCents: Math.max(0, baseTotalCents - totalCents),
    bundles,
  };
}

/**
 * Split `totalCents` across `weights` so the parts sum to exactly totalCents.
 *
 * Largest-remainder method. Naive rounding of each share drifts and produces
 * line items that do not add up to the order total — which is the kind of bug
 * that surfaces as a one-cent discrepancy on a customer's receipt.
 */
export function allocateProportionally(
  totalCents: number,
  weights: readonly number[],
): number[] {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new RangeError(`totalCents must be a non-negative integer, got ${totalCents}`);
  }
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum <= 0) return weights.map(() => 0);

  const exact = weights.map((w) => (totalCents * w) / weightSum);
  const floors = exact.map(Math.floor);
  let remainder = totalCents - floors.reduce((a, b) => a + b, 0);

  // Hand the leftover cents to the largest fractional parts first. Ties go to
  // the earlier index so the result is deterministic.
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const out = [...floors];
  for (let k = 0; remainder > 0; k = (k + 1) % order.length) {
    out[order[k].i] += 1;
    remainder -= 1;
  }
  return out;
}

export type CartItem = {
  variantId: string;
  kind: ProductKind;
  /** Customer-facing flavor name, snapshotted onto the order. */
  flavorName: string;
  quantity: number;
};

export type ItemAllocation = {
  variantId: string;
  flavorName: string;
  quantity: number;
  /** This flavor's share of the group total, summing exactly to it. */
  allocatedCents: number;
};

export type PricedGroup = {
  kind: ProductKind;
  price: LinePrice;
  allocations: ItemAllocation[];
};

export type CartPrice = {
  groups: PricedGroup[];
  subtotalCents: number;
  savingsCents: number;
};

/**
 * Price a whole cart.
 *
 * Bundles apply per product kind across all flavors, because mixing is
 * allowed and every flavor within a kind costs the same. Two Plain bars and
 * one Hazelnut is three bars: one pair at $10 plus one at $7.
 *
 * This is the only function the cart and the server-side checkout re-validation
 * should call. Never trust a total that arrives from the client.
 */
export function priceCart(
  items: readonly CartItem[],
  tiersByKind: Record<ProductKind, readonly BundleTier[]> = TIERS_BY_KIND,
): CartPrice {
  const kinds: ProductKind[] = ["bonbon", "bar"];
  const groups: PricedGroup[] = [];

  for (const kind of kinds) {
    const inKind = items.filter((i) => i.kind === kind && i.quantity > 0);
    if (inKind.length === 0) continue;

    // Merge duplicate lines for the same variant before pricing.
    const byVariant = new Map<string, CartItem>();
    for (const item of inKind) {
      if (!Number.isInteger(item.quantity) || item.quantity < 0) {
        throw new RangeError(
          `quantity must be a non-negative integer, got ${item.quantity} for ${item.variantId}`,
        );
      }
      const existing = byVariant.get(item.variantId);
      if (existing) existing.quantity += item.quantity;
      else byVariant.set(item.variantId, { ...item });
    }

    const lines = [...byVariant.values()];
    const quantity = lines.reduce((sum, l) => sum + l.quantity, 0);
    const price = priceQuantity(quantity, tiersByKind[kind]);

    const shares = allocateProportionally(
      price.totalCents,
      lines.map((l) => l.quantity),
    );

    groups.push({
      kind,
      price,
      allocations: lines.map((l, idx) => ({
        variantId: l.variantId,
        flavorName: l.flavorName,
        quantity: l.quantity,
        allocatedCents: shares[idx],
      })),
    });
  }

  return {
    groups,
    subtotalCents: groups.reduce((sum, g) => sum + g.price.totalCents, 0),
    savingsCents: groups.reduce((sum, g) => sum + g.price.savingsCents, 0),
  };
}

/**
 * When the next unit up costs the same or less, say so.
 *
 * Schedule A has two of these: 9 bon-bons and 10 both cost $15, and 19 and 20
 * both cost $30. A customer paying $15 for nine pieces should be told the
 * tenth is free rather than discovering it later.
 */
export function findFreeUpgrade(
  quantity: number,
  tiers: readonly BundleTier[],
  lookahead = 3,
): { extraUnits: number; newQuantity: number } | null {
  if (quantity <= 0) return null;
  const current = priceQuantity(quantity, tiers).totalCents;
  for (let extra = 1; extra <= lookahead; extra++) {
    if (priceQuantity(quantity + extra, tiers).totalCents <= current) {
      return { extraUnits: extra, newQuantity: quantity + extra };
    }
  }
  return null;
}

/** Format integer cents as a display string. Presentation only. */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
