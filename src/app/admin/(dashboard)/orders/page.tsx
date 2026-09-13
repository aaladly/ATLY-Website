import type { Metadata } from "next";
import Link from "next/link";
import { orderStore } from "@/lib/orders/store";
import { ORDER_STATUS_LABEL } from "@/lib/orders/status";
import { formatCents } from "@/lib/pricing";
import { isPaymentConfigured } from "@/lib/payments";
import { ActionButton } from "@/components/admin/ActionButton";
import { seedSampleOrderAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Orders" };

const formatWhen = (iso: string): string =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default async function AdminOrdersPage() {
  const orders = await orderStore.list();

  return (
    <div>
      <h1 className="text-display-l">Orders</h1>

      {orders.length === 0 ? (
        <div className="mt-8 border border-rule bg-ivory p-7">
          <h2 className="text-display-s">Nothing here yet</h2>
          {!isPaymentConfigured() ? (
            <p className="mt-3 text-body-m text-cocoa">
              No order can arrive until online payment is switched on. Checkout
              currently validates an order completely and then refuses it,
              rather than recording something nobody has paid for.
            </p>
          ) : (
            <p className="mt-3 text-body-m text-cocoa">
              Orders will appear here as they come in, newest first.
            </p>
          )}

          {process.env.NODE_ENV === "development" && (
            <div className="mt-7 border-t border-rule pt-6">
              <ActionButton
                action={seedSampleOrderAction}
                label="Add a sample order"
                note="Development only. Makes one obviously-fake order so you can see what these screens do before the first real one arrives."
              />
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="mt-4 text-body-m text-cocoa">
            Newest first. Click a reference to see the whole order.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-left">
              <caption className="sr-only">
                All orders, newest first, with status and total
              </caption>
              <thead>
                <tr className="border-b border-rule-strong">
                  <th scope="col" className="label-caps py-3 pr-4">Reference</th>
                  <th scope="col" className="label-caps py-3 pr-4">Placed</th>
                  <th scope="col" className="label-caps py-3 pr-4">Customer</th>
                  <th scope="col" className="label-caps py-3 pr-4">Town</th>
                  <th scope="col" className="label-caps py-3 pr-4">Total</th>
                  <th scope="col" className="label-caps py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.reference} className="border-b border-rule">
                    <td className="py-4 pr-4 text-body-m">
                      <Link
                        href={`/admin/orders/${order.reference}`}
                        className="font-medium tracking-wide text-cocoa-deep"
                      >
                        {order.reference}
                      </Link>
                    </td>
                    <td className="py-4 pr-4 text-body-s text-cocoa">
                      {formatWhen(order.placedAt)}
                    </td>
                    <td className="py-4 pr-4 text-body-s">{order.contact.name}</td>
                    <td className="py-4 pr-4 text-body-s text-cocoa">
                      {order.address.city}
                      {order.inFreeCounty && (
                        <span className="ml-2 text-label uppercase text-gold-deep">
                          Hand
                        </span>
                      )}
                    </td>
                    <td className="py-4 pr-4 text-body-m tabular-nums">
                      {formatCents(order.totalCents)}
                    </td>
                    <td className="py-4 text-body-s">
                      <span
                        className={
                          order.status === "awaiting_payment"
                            ? "text-error"
                            : order.status === "delivered" || order.status === "cancelled"
                              ? "text-cocoa"
                              : "text-cocoa-deep"
                        }
                      >
                        {ORDER_STATUS_LABEL[order.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {process.env.NODE_ENV === "development" && (
            <div className="mt-10 border-t border-rule pt-6">
              <ActionButton
                action={seedSampleOrderAction}
                label="Add another sample order"
                note="Development only."
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
