import { BRAND } from "@/lib/catalog";
import { formatCents } from "@/lib/pricing";

/**
 * The New Jersey-only notice.
 *
 * The working agreement is explicit that this must be stated clearly BEFORE
 * checkout and never as a surprise at the address step. So it appears on the
 * home page, on the shop, and on every product page — not only in the footer.
 *
 * `tone="prominent"` is the banded version for the top of a page; `tone="inline"`
 * is a quieter line for inside a product panel.
 */
export function DeliveryNotice({
  tone = "inline",
}: {
  tone?: "prominent" | "inline";
}) {
  const standard = formatCents(BRAND.delivery.standardCents);

  if (tone === "prominent") {
    return (
      <aside className="border-y border-rule bg-ivory">
        <div className="mx-auto max-w-6xl px-gutter py-5 text-center">
          <p className="label-caps">Delivery area</p>
          <p className="mt-2 text-body-m">
            We currently deliver within{" "}
            <strong>{BRAND.delivery.stateOnly} only</strong> — we are not
            shipping nationwide yet.
          </p>
          <p className="mt-1 text-body-s text-cocoa">
            Free delivery throughout {BRAND.delivery.freeCounty}. {standard}{" "}
            elsewhere in {BRAND.delivery.stateOnly}.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <p className="text-body-s text-cocoa">
      <strong className="text-cocoa-deep">
        {BRAND.delivery.stateOnly} delivery only.
      </strong>{" "}
      Free throughout {BRAND.delivery.freeCounty}, {standard} elsewhere in{" "}
      {BRAND.delivery.stateOnly}.
    </p>
  );
}
