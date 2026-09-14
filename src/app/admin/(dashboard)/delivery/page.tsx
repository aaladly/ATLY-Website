import type { Metadata } from "next";
import Link from "next/link";
import { getStorefrontSettings } from "@/lib/settings/resolve";
import { centsToDollarInput, unweighedVariantNames } from "@/lib/settings/apply";
import { AdminForm } from "@/components/admin/AdminForm";
import { saveDeliveryAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Delivery" };

/** Spare rows, so a weight tier can be added without any JavaScript. */
const BLANK_WEIGHT_ROWS = 3;

export default async function AdminDeliveryPage() {
  const settings = await getStorefrontSettings();
  const { delivery } = settings;
  const unweighed = unweighedVariantNames(settings.products);

  const weightRows = delivery.weightTiers.length + BLANK_WEIGHT_ROWS;

  return (
    <div>
      <h1 className="text-display-l">Delivery</h1>
      <p className="mt-4 max-w-2xl text-body-m text-cocoa">
        These rules decide what every customer is charged, so they are checked
        before they are saved. Anything that would stop the site quoting a price
        is refused with the reason.
      </p>

      <AdminForm action={saveDeliveryAction} submitLabel="Save delivery rules">
        {/* ---- Rates ---- */}
        <fieldset className="mt-8 min-w-0 border border-rule bg-ivory p-6">
          <legend className="label-caps px-2">What you charge</legend>

          <label htmlFor="standard" className="mb-2 block text-body-s text-cocoa">
            Standard delivery anywhere in {delivery.allowedStateName} ($)
          </label>
          <input
            id="standard"
            name="standard"
            type="text"
            inputMode="decimal"
            defaultValue={centsToDollarInput(delivery.standardCents)}
            className="h-11 w-32 rounded-sm border border-cocoa bg-cream px-4 text-body-m"
          />
          <p className="mt-3 text-body-s text-cocoa">
            {delivery.allowedStateName} only. Everywhere else is refused before
            the customer reaches the address step, and again on the server before
            anything is charged.
          </p>
        </fieldset>

        {/* ---- Free county ---- */}
        <fieldset className="mt-8 min-w-0 border border-rule bg-ivory p-6">
          <legend className="label-caps px-2">
            Free delivery in {delivery.freeCountyName}
          </legend>

          <label className="flex min-h-11 items-center gap-3 text-body-m">
            <input
              type="checkbox"
              name="alwaysFree"
              defaultChecked={delivery.freeCounty.alwaysFree}
              className="h-5 w-5 accent-cocoa-deep"
            />
            Free for every order in {delivery.freeCountyName}, whatever the size
          </label>

          <div className="mt-6">
            <label htmlFor="threshold" className="mb-2 block text-body-s text-cocoa">
              Or free above this amount ($)
            </label>
            <input
              id="threshold"
              name="threshold"
              type="text"
              inputMode="decimal"
              defaultValue={centsToDollarInput(delivery.freeCounty.thresholdCents)}
              className="h-11 w-32 rounded-sm border border-cocoa bg-cream px-4 text-body-m"
            />
            <label className="mt-4 flex min-h-11 items-center gap-3 text-body-s">
              <input
                type="checkbox"
                name="thresholdInclusive"
                defaultChecked={delivery.freeCounty.thresholdInclusive}
                className="h-5 w-5 accent-cocoa-deep"
              />
              An order exactly on that amount counts
            </label>
            <p className="mt-3 text-body-s text-cocoa">
              Only used when the box above is unticked. It is kept either way so
              you can go back to a minimum without anyone editing the code.
            </p>
          </div>
        </fieldset>

        {/* ---- ZIP lists ---- */}
        <fieldset className="mt-8 min-w-0 border border-rule bg-ivory p-6">
          <legend className="label-caps px-2">Which ZIP codes</legend>

          <label htmlFor="freeZips" className="mb-2 block text-body-s text-cocoa">
            Free-delivery ZIP codes — {delivery.freeCountyName}
          </label>
          <textarea
            id="freeZips"
            name="freeZips"
            rows={5}
            defaultValue={delivery.freeCountyZips.join(" ")}
            className="w-full rounded-sm border border-cocoa bg-cream px-4 py-3 font-mono text-body-s"
          />
          <p className="mt-3 text-body-s text-cocoa">
            {delivery.freeCountyZips.length} at the moment. Separate them
            however you like — spaces, commas or new lines all work, and you can
            paste straight from a spreadsheet.
          </p>
          <p className="mt-3 max-w-2xl text-body-s">
            <strong className="text-error">Worth checking.</strong> A ZIP that is
            missing gets charged {centsToDollarInput(delivery.standardCents)}{" "}
            when it should have been free — which is the safe direction to be
            wrong, but still wrong. The starting list was put together from
            public sources and has not been checked against USPS.
          </p>

          <label
            htmlFor="excludedZips"
            className="mt-8 mb-2 block text-body-s text-cocoa"
          >
            ZIP codes you will not deliver to at all
          </label>
          <textarea
            id="excludedZips"
            name="excludedZips"
            rows={2}
            defaultValue={delivery.excludedZips.join(" ")}
            placeholder="usually empty"
            className="w-full rounded-sm border border-cocoa bg-cream px-4 py-3 font-mono text-body-s"
          />
          <p className="mt-3 text-body-s text-cocoa">
            Anyone at one of these is told, kindly, that you cannot reach them
            yet — before they fill anything in.
          </p>
        </fieldset>

        {/* ---- Weight tiers ---- */}
        <fieldset className="mt-8 min-w-0 border border-rule bg-ivory p-6">
          <legend className="label-caps px-2">Charging by weight</legend>

          <input type="hidden" name="wtRows" value={weightRows} />

          {unweighed.length > 0 && (
            <div className="mb-6 border-2 border-error bg-cream p-5">
              <p className="text-body-m text-error">
                Not possible yet — {unweighed.length} thing
                {unweighed.length === 1 ? " has" : "s have"} no packaged weight.
              </p>
              <p className="mt-2 text-body-s text-cocoa">
                The moment there is a weight tier, the site refuses any order it
                cannot weigh. With {unweighed.join(", ")} unweighed, that would
                be every order on the site, so saving a tier here is blocked
                until they are done. Weigh them on{" "}
                <Link href="/admin/products" className="text-gold-deep">
                  Products &amp; prices
                </Link>{" "}
                first.
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[26rem] border-collapse text-left">
              <caption className="sr-only">
                Delivery price by total packaged weight
              </caption>
              <thead>
                <tr className="border-b border-rule-strong">
                  <th scope="col" className="label-caps py-2 pr-4">Up to (oz)</th>
                  <th scope="col" className="label-caps py-2">Price ($)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: weightRows }, (_, index) => {
                  const tier = delivery.weightTiers[index];
                  return (
                    <tr key={index} className="border-b border-rule">
                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          inputMode="decimal"
                          name={`wt:${index}:oz`}
                          defaultValue={tier ? String(tier.maxOunces) : ""}
                          aria-label={`Weight tier ${index + 1}: up to how many ounces`}
                          className="h-10 w-28 rounded-sm border border-cocoa bg-cream px-3 text-body-s"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="text"
                          inputMode="decimal"
                          name={`wt:${index}:price`}
                          defaultValue={tier ? centsToDollarInput(tier.priceCents) : ""}
                          aria-label={`Weight tier ${index + 1}: price in dollars`}
                          className="h-10 w-28 rounded-sm border border-cocoa bg-cream px-3 text-body-s"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-4 max-w-2xl text-body-s text-cocoa">
            Leave every row blank to keep the single flat rate. With rows filled
            in, an order is charged the cheapest tier its total weight fits
            inside, and anything heavier than the last row is told to get in
            touch rather than quoted a number you did not set. 48 oz is 3 lb.
          </p>
        </fieldset>
      </AdminForm>
    </div>
  );
}
