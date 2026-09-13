import type { Metadata } from "next";
import { getStorefrontSettings } from "@/lib/settings/resolve";
import { centsToDollarInput } from "@/lib/settings/apply";
import { ALLERGEN_LABEL } from "@/lib/catalog";
import { TIERS_BY_KIND, summarizeTiers, type ProductKind } from "@/lib/pricing";
import { AdminForm } from "@/components/admin/AdminForm";
import { ActionButton } from "@/components/admin/ActionButton";
import {
  saveProductsAction,
  savePricingAction,
  resetSettingsAction,
} from "@/app/admin/actions";

export const metadata: Metadata = { title: "Products & prices" };

/** Spare rows so a new price can be added without any JavaScript. */
const BLANK_TIER_ROWS = 2;

const KIND_LABEL: Record<ProductKind, string> = {
  bonbon: "Bon-bons",
  bar: "Bars",
};

export default async function AdminProductsPage() {
  const settings = await getStorefrontSettings();

  return (
    <div>
      <h1 className="text-display-l">Products &amp; prices</h1>

      {/* =============== Availability and weights =============== */}
      <section className="mt-10">
        <h2 className="text-display-m">What is available</h2>
        <p className="mt-3 max-w-2xl text-body-m text-cocoa">
          Unticking something takes it off the shop straight away. Anyone who
          already has it in their cart is told it has sold out and cannot check
          out with it.
        </p>

        <AdminForm action={saveProductsAction} submitLabel="Save availability">
          {settings.products.map((product) => (
            <fieldset
              key={product.slug}
              className="mt-8 min-w-0 border border-rule bg-ivory p-6"
            >
              <legend className="label-caps px-2">{product.name}</legend>

              <label className="flex items-center gap-3 text-body-m">
                <input
                  type="checkbox"
                  name={`available:${product.slug}`}
                  defaultChecked={product.isAvailable}
                  className="h-5 w-5 accent-cocoa-deep"
                />
                Sell {product.name.toLowerCase()} at all
              </label>
              <p className="mt-2 text-body-s text-cocoa">
                Untick to take the whole line off the shop, whatever the
                individual flavors say.
              </p>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[32rem] border-collapse text-left">
                  <caption className="sr-only">
                    {product.name} flavors, whether each is available, and its
                    packaged weight
                  </caption>
                  <thead>
                    <tr className="border-b border-rule-strong">
                      <th scope="col" className="label-caps py-2 pr-4">Flavor</th>
                      <th scope="col" className="label-caps py-2 pr-4">Selling</th>
                      <th scope="col" className="label-caps py-2">
                        Packaged weight (oz)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((variant) => {
                      const key = `${product.slug}/${variant.slug}`;
                      return (
                        <tr key={variant.slug} className="border-b border-rule">
                          <td className="py-3 pr-4 text-body-m">
                            {variant.name}
                            <span className="block text-body-s text-cocoa">
                              Contains{" "}
                              {variant.containsAllergens
                                .map((a) => ALLERGEN_LABEL[a].toLowerCase())
                                .join(", ")}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <label className="flex items-center gap-2 text-body-s">
                              <input
                                type="checkbox"
                                name={`available:${key}`}
                                defaultChecked={variant.isAvailable}
                                className="h-5 w-5 accent-cocoa-deep"
                              />
                              <span className="sr-only">
                                Selling {variant.name}
                              </span>
                              <span aria-hidden="true">Yes</span>
                            </label>
                          </td>
                          <td className="py-3">
                            <input
                              type="text"
                              inputMode="decimal"
                              name={`weight:${key}`}
                              defaultValue={
                                variant.packagedWeightOz === null
                                  ? ""
                                  : String(variant.packagedWeightOz)
                              }
                              placeholder="not weighed"
                              aria-label={`Packaged weight of ${variant.name} in ounces`}
                              className="h-10 w-32 rounded-sm border border-cocoa bg-cream px-3 text-body-s"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </fieldset>
          ))}

          <p className="mt-5 max-w-2xl text-body-s text-cocoa">
            Packaged weight is the whole thing on a kitchen scale — chocolate,
            box, ribbon and all. Leave it blank if you have not weighed it.
            Delivery stays a flat rate until every one has a weight; only then
            can weight tiers be switched on.
          </p>
        </AdminForm>
      </section>

      {/* =============== Prices =============== */}
      <section className="mt-section border-t border-rule-strong pt-10">
        <h2 className="text-display-m">Prices</h2>
        <p className="mt-3 max-w-2xl text-body-m text-cocoa">
          The cheapest combination is worked out for the customer
          automatically — they do not pick a box size. Nine bon-bons priced at
          $2 each, 3 for $5 and 10 for $15 come to $15, and the site offers them
          the tenth free.
        </p>

        <AdminForm action={savePricingAction} submitLabel="Save prices">
          {(["bonbon", "bar"] as const).map((kind) => {
            const tiers = [...settings.tiers[kind]].sort((a, b) => a.size - b.size);
            const rowCount = tiers.length + BLANK_TIER_ROWS;

            return (
              <fieldset key={kind} className="mt-8 min-w-0 border border-rule bg-ivory p-6">
                <legend className="label-caps px-2">{KIND_LABEL[kind]}</legend>

                <input type="hidden" name={`tierRows:${kind}`} value={rowCount} />

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[34rem] border-collapse text-left">
                    <caption className="sr-only">
                      {KIND_LABEL[kind]} prices by quantity
                    </caption>
                    <thead>
                      <tr className="border-b border-rule-strong">
                        <th scope="col" className="label-caps py-2 pr-4">How many</th>
                        <th scope="col" className="label-caps py-2 pr-4">Price ($)</th>
                        <th scope="col" className="label-caps py-2">
                          What customers see
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: rowCount }, (_, index) => {
                        const tier = tiers[index];
                        return (
                          <tr key={index} className="border-b border-rule">
                            <td className="py-3 pr-4">
                              <input
                                type="text"
                                inputMode="numeric"
                                name={`tier:${kind}:${index}:size`}
                                defaultValue={tier ? String(tier.size) : ""}
                                aria-label={`${KIND_LABEL[kind]} price ${index + 1}: how many`}
                                className="h-10 w-20 rounded-sm border border-cocoa bg-cream px-3 text-body-s"
                              />
                            </td>
                            <td className="py-3 pr-4">
                              <input
                                type="text"
                                inputMode="decimal"
                                name={`tier:${kind}:${index}:price`}
                                defaultValue={
                                  tier ? centsToDollarInput(tier.priceCents) : ""
                                }
                                aria-label={`${KIND_LABEL[kind]} price ${index + 1}: price in dollars`}
                                className="h-10 w-28 rounded-sm border border-cocoa bg-cream px-3 text-body-s"
                              />
                            </td>
                            <td className="py-3">
                              <input
                                type="text"
                                name={`tier:${kind}:${index}:label`}
                                defaultValue={tier ? tier.label : ""}
                                placeholder="written for you if blank"
                                aria-label={`${KIND_LABEL[kind]} price ${index + 1}: wording`}
                                className="h-10 w-full min-w-[12rem] rounded-sm border border-cocoa bg-cream px-3 text-body-s"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="mt-4 text-body-s text-cocoa">
                  On the site now: {summarizeTiers(settings.tiers[kind])}. Clear
                  both boxes on a row to remove that price. Every line must keep
                  a price for a single one.
                </p>
              </fieldset>
            );
          })}
        </AdminForm>
      </section>

      {/* =============== Back to the defaults =============== */}
      <section className="mt-section border-t border-rule-strong pt-10">
        <h2 className="text-display-s">Start over</h2>
        <p className="mt-3 max-w-2xl text-body-m text-cocoa">
          Throws away every change made here and on the Delivery page, and puts
          the site back to what is in the code: {summarizeTiers(TIERS_BY_KIND.bonbon)}{" "}
          for bon-bons, {summarizeTiers(TIERS_BY_KIND.bar)} for bars, everything
          available, and the delivery rules as written.
        </p>
        <div className="mt-6">
          <ActionButton
            action={resetSettingsAction}
            label="Put everything back"
            tone="danger"
          />
        </div>
      </section>
    </div>
  );
}
