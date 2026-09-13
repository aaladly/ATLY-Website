import type { Metadata } from "next";
import Link from "next/link";
import { orderStore } from "@/lib/orders/store";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders/status";
import { getStorefrontSettings } from "@/lib/settings/resolve";
import { unweighedVariantNames } from "@/lib/settings/apply";
import { summarizeTiers, formatCents } from "@/lib/pricing";
import { isPaymentConfigured } from "@/lib/payments";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  const [orders, settings] = await Promise.all([
    orderStore.list(),
    getStorefrontSettings(),
  ]);

  const counts = orders.reduce<Partial<Record<OrderStatus, number>>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});

  const needsAttention = orders.filter(
    (order) => order.status === "new" || order.status === "in_production",
  ).length;

  const soldOut = settings.products.flatMap((product) =>
    product.variants
      .filter((variant) => !product.isAvailable || !variant.isAvailable)
      .map((variant) => `${product.name} — ${variant.name}`),
  );

  const unweighed = unweighedVariantNames(settings.products);

  return (
    <div>
      <h1 className="text-display-l">Overview</h1>

      {/* ---- Orders ---- */}
      <section className="mt-10">
        <h2 className="label-caps">Orders</h2>
        {orders.length === 0 ? (
          <p className="mt-4 text-body-m text-cocoa">
            No orders yet.{" "}
            <Link href="/admin/orders" className="text-gold-deep">
              The orders page
            </Link>{" "}
            explains why none can arrive until online payment is switched on.
          </p>
        ) : (
          <>
            <p className="mt-4 text-display-m">
              {needsAttention} to deal with
            </p>
            <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
              {(Object.keys(counts) as OrderStatus[]).map((status) => (
                <li key={status} className="text-body-s text-cocoa">
                  {ORDER_STATUS_LABEL[status]}: {counts[status]}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-body-s">
              <Link href="/admin/orders" className="text-gold-deep">
                See all {orders.length} order{orders.length === 1 ? "" : "s"}
              </Link>
            </p>
          </>
        )}
      </section>

      {/* ---- What the site is doing right now ---- */}
      <section className="mt-12 border-t border-rule-strong pt-8">
        <h2 className="label-caps">What the site is charging</h2>
        <dl className="mt-5 grid gap-x-10 gap-y-5 sm:grid-cols-2">
          <div>
            <dt className="text-body-s text-cocoa">Bon-bons</dt>
            <dd className="text-body-m">{summarizeTiers(settings.tiers.bonbon)}</dd>
          </div>
          <div>
            <dt className="text-body-s text-cocoa">Bars</dt>
            <dd className="text-body-m">{summarizeTiers(settings.tiers.bar)}</dd>
          </div>
          <div>
            <dt className="text-body-s text-cocoa">Delivery</dt>
            <dd className="text-body-m">
              {formatCents(settings.delivery.standardCents)} in{" "}
              {settings.delivery.allowedStateName}
            </dd>
          </div>
          <div>
            <dt className="text-body-s text-cocoa">Free delivery</dt>
            <dd className="text-body-m">
              {settings.delivery.freeCounty.alwaysFree
                ? `Every order in ${settings.delivery.freeCountyName}`
                : `${formatCents(settings.delivery.freeCounty.thresholdCents)} or more in ${settings.delivery.freeCountyName}`}{" "}
              <span className="text-body-s text-cocoa">
                ({settings.delivery.freeCountyZips.length} ZIP codes)
              </span>
            </dd>
          </div>
        </dl>
        <p className="mt-6 text-body-s text-cocoa">
          {settings.updatedAt
            ? `Last changed ${new Date(settings.updatedAt).toLocaleString("en-US")}.`
            : "Nothing has been changed here — the site is running on the prices and rules in the code."}
        </p>
      </section>

      {/* ---- Things that need the owner ---- */}
      <section className="mt-12 border-t border-rule-strong pt-8">
        <h2 className="label-caps">Needs you</h2>
        <ul className="mt-5 space-y-5">
          {!isPaymentConfigured() && (
            <li className="border border-error bg-ivory p-5">
              <p className="text-body-m text-error">
                Online payment is not switched on.
              </p>
              <p className="mt-2 text-body-s text-cocoa">
                Checkout works all the way through and then politely refuses, so
                no order can be taken. That is deliberate — an unpaid order
                reaching the kitchen would be worse. Add your Stripe keys to{" "}
                <code>.env.local</code> to open ordering.
              </p>
            </li>
          )}

          {unweighed.length > 0 && (
            <li className="border border-rule bg-ivory p-5">
              <p className="text-body-m">
                {unweighed.length} thing{unweighed.length === 1 ? " has" : "s have"} no
                packaged weight.
              </p>
              <p className="mt-2 text-body-s text-cocoa">
                Delivery is a flat rate until every one is weighed. Weigh a
                filled box and a wrapped bar on a kitchen scale and enter the
                ounces on{" "}
                <Link href="/admin/products" className="text-gold-deep">
                  Products &amp; prices
                </Link>
                .
              </p>
            </li>
          )}

          {soldOut.length > 0 && (
            <li className="border border-rule bg-ivory p-5">
              <p className="text-body-m">Marked sold out: {soldOut.join(", ")}.</p>
              <p className="mt-2 text-body-s text-cocoa">
                Customers cannot add {soldOut.length === 1 ? "it" : "these"} to a
                cart, and checkout refuses {soldOut.length === 1 ? "it" : "them"}{" "}
                if {soldOut.length === 1 ? "it is" : "they are"} already in one.
              </p>
            </li>
          )}

          {isPaymentConfigured() && unweighed.length === 0 && soldOut.length === 0 && (
            <li className="text-body-m text-cocoa">Nothing waiting on you.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
