import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { orderStore } from "@/lib/orders/store";
import { ORDER_STATUS_LABEL } from "@/lib/orders/status";
import { normalizeReference } from "@/lib/orderReference";
import { formatCents } from "@/lib/pricing";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";

export async function generateMetadata({
  params,
}: PageProps<"/admin/orders/[reference]">): Promise<Metadata> {
  const { reference } = await params;
  return { title: `Order ${normalizeReference(reference) ?? reference}` };
}

export default async function AdminOrderPage({
  params,
}: PageProps<"/admin/orders/[reference]">) {
  const { reference } = await params;

  // A reference that is not even shaped like one never reaches the store.
  const normalized = normalizeReference(reference);
  const order = normalized ? await orderStore.get(normalized) : undefined;
  if (!order) notFound();

  const itemCount = order.lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div>
      <p className="text-body-s">
        <Link href="/admin/orders" className="text-cocoa no-underline hover:text-gold-deep">
          &larr; All orders
        </Link>
      </p>

      <h1 className="mt-5 text-display-l tracking-wide">{order.reference}</h1>
      <p className="mt-3 text-body-m text-cocoa">
        Placed {new Date(order.placedAt).toLocaleString("en-US")} ·{" "}
        {ORDER_STATUS_LABEL[order.status]}
        {order.statusChangedAt &&
          `, changed ${new Date(order.statusChangedAt).toLocaleString("en-US")}`}
      </p>

      {order.status === "awaiting_payment" && (
        <div role="alert" className="mt-7 border-2 border-error bg-ivory p-5">
          <p className="text-body-m text-error">This has not been paid for.</p>
          <p className="mt-2 text-body-s text-cocoa">
            Do not make or deliver it until payment is confirmed.
          </p>
        </div>
      )}

      {/* ---- Status ---- */}
      <section className="mt-10 border border-rule bg-ivory p-6">
        <OrderStatusForm reference={order.reference} current={order.status} />
      </section>

      {/* ---- What to make ---- */}
      <section className="mt-12">
        <h2 className="label-caps">What to make</h2>
        <p className="mt-3 text-body-m text-cocoa">
          {itemCount} item{itemCount === 1 ? "" : "s"} in total.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-left">
            <caption className="sr-only">Items in this order</caption>
            <thead>
              <tr className="border-b border-rule-strong">
                <th scope="col" className="label-caps py-3 pr-4">Item</th>
                <th scope="col" className="label-caps py-3 pr-4">Quantity</th>
                <th scope="col" className="label-caps py-3">Charged</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.variantId} className="border-b border-rule">
                  <td className="py-4 pr-4 text-body-m">
                    {line.variantName}
                    <span className="block text-body-s text-cocoa">
                      {line.productName}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-body-m tabular-nums">{line.quantity}</td>
                  <td className="py-4 text-body-m tabular-nums">
                    {formatCents(line.lineTotalCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {order.appliedBundles.length > 0 && (
          <p className="mt-4 text-body-s text-gold-deep">
            Priced as{" "}
            {order.appliedBundles
              .map((b) => `${b.count > 1 ? `${b.count}× ` : ""}${b.label}`)
              .join(" + ")}
            .
          </p>
        )}

        {order.giftNote && (
          <div className="mt-7 border border-rule bg-ivory p-5">
            <h3 className="label-caps">Gift note — write this on a card</h3>
            <p className="mt-3 font-display text-display-s">{order.giftNote}</p>
          </div>
        )}
      </section>

      {/* ---- Where it goes ---- */}
      <section className="mt-12 grid gap-10 sm:grid-cols-2">
        <div>
          <h2 className="label-caps">Deliver to</h2>
          <address className="mt-4 text-body-m not-italic">
            {order.contact.name}
            <br />
            {order.address.line1}
            <br />
            {order.address.line2 && (
              <>
                {order.address.line2}
                <br />
              </>
            )}
            {order.address.city}, {order.address.state} {order.address.zip}
          </address>
          <p className="mt-4 text-body-s">
            {order.inFreeCounty ? (
              <span className="text-gold-deep">
                Hand-delivered — free delivery area.
              </span>
            ) : (
              <span className="text-cocoa">By carrier.</span>
            )}
          </p>
        </div>

        <div>
          <h2 className="label-caps">Get in touch</h2>
          <p className="mt-4 text-body-m">
            <a href={`mailto:${order.contact.email}`} className="text-cocoa-deep">
              {order.contact.email}
            </a>
          </p>
          <p className="mt-2 text-body-m">
            <a href={`tel:${order.contact.phone}`} className="text-cocoa-deep">
              {order.contact.phone}
            </a>
          </p>
        </div>
      </section>

      {/* ---- Money ----
          The figures as they were charged. Prices and delivery rules are
          editable, so a placed order shows what it cost then, never what the
          same basket would cost today. */}
      <section className="mt-12 border-t border-rule-strong pt-6">
        <h2 className="label-caps">What they paid</h2>
        <dl className="mt-4 max-w-sm space-y-3">
          <Row label="Subtotal" value={formatCents(order.subtotalCents)} />
          {order.savingsCents > 0 && (
            <Row label="Bundle savings" value={`−${formatCents(order.savingsCents)}`} />
          )}
          <Row
            label="Delivery"
            value={order.deliveryCents === 0 ? "Free" : formatCents(order.deliveryCents)}
          />
          <Row label="Sales tax" value={formatCents(order.taxCents)} />
          <div className="flex items-baseline justify-between gap-4 border-t border-rule pt-3">
            <dt className="text-body-m">Total</dt>
            <dd className="text-display-s tabular-nums">
              {formatCents(order.totalCents)}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-body-m">{label}</dt>
      <dd className="text-body-m tabular-nums">{value}</dd>
    </div>
  );
}
