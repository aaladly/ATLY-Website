import Link from "next/link";
import {
  ALLERGEN_LABEL,
  CROSS_CONTACT_STATEMENT,
  type Product,
} from "@/lib/catalog";

/**
 * What we are able to say about allergens right now.
 *
 * Two states, and the unfinished one is the honest one rather than an empty
 * box. The allergen TAGS are safe to show: they come from facts the owner has
 * stated — the couverture is Belcolade Lait Selection, a milk chocolate, and
 * the nut products are named for their nuts. The INGREDIENT LISTS and the
 * cross-contact statement are not ours to write and are not shown until they
 * exist.
 *
 * Saying nothing in the meantime would be the dangerous option: to a customer
 * with an allergy, an allergen section with no cross-contact warning reads as
 * "we checked, and there is no risk".
 */
export function AllergenNotice({
  products,
  compact = false,
}: {
  products: readonly Product[];
  compact?: boolean;
}) {
  const complete =
    CROSS_CONTACT_STATEMENT !== null &&
    products.every((p) => p.variants.every((v) => v.ingredients !== null));

  return (
    <div className={compact ? "" : "space-y-10"}>
      {products.map((product) => (
        <section key={product.slug} className={compact ? "mt-5 first:mt-0" : ""}>
          {/* The compact variant sits inside a product page's own "Allergens"
              section, which has already said which product this is. Repeating
              the name adds a heading level and no information. */}
          {!compact && <h3 className="text-display-s">{product.name}</h3>}

          <ul className="mt-3 divide-y divide-rule border-y border-rule">
            {product.variants.map((variant) => (
              <li key={variant.slug} className="py-3">
                <p className="text-body-m">
                  {variant.name}
                  {!variant.isAvailable && (
                    <span className="ml-2 text-body-s text-cocoa">
                      (not available at the moment)
                    </span>
                  )}
                </p>
                <p className="mt-1 text-body-s">
                  <span className="text-cocoa">Contains: </span>
                  {variant.containsAllergens
                    .map((a) => ALLERGEN_LABEL[a])
                    .join(", ")}
                </p>

                {variant.ingredients ? (
                  <p className="mt-2 text-body-s text-cocoa">
                    <span className="sr-only">Ingredients: </span>
                    {variant.ingredients.join(", ")}.
                  </p>
                ) : (
                  <p className="mt-2 text-body-s text-cocoa">
                    Full ingredient list still to come.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* ---- Cross-contact ---- */}
      <section className={compact ? "mt-6" : ""}>
        <h3 className={compact ? "label-caps" : "text-display-s"}>
          Made in a shared kitchen
        </h3>

        {CROSS_CONTACT_STATEMENT !== null ? (
          <p className="mt-3 text-body-m">{CROSS_CONTACT_STATEMENT}</p>
        ) : (
          <div className="mt-3 border-2 border-error bg-ivory p-5">
            <p className="text-body-m text-error">
              Everything here is made by hand in one family kitchen, and that
              kitchen handles peanuts and tree nuts.
            </p>
            <p className="mt-3 text-body-m">
              We have not finished writing our cross-contact statement, so we
              are not going to tell you it is safe. If you have a nut allergy,
              please message us before you order and we will tell you exactly
              how we work.
            </p>
          </div>
        )}
      </section>

      {!complete && !compact && (
        <p className="text-body-s text-cocoa">
          {/* TODO: remove once the owner supplies the ingredient lists and the
              cross-contact statement. Nothing on this page is written from
              guesswork, and nothing on it should be. */}
          This page is not finished. Ingredient lists and our full allergen
          statement are being prepared and will appear here before ordering
          opens.
        </p>
      )}

      {compact && (
        <p className="mt-5 text-body-s">
          <Link href="/allergens" className="text-gold-deep">
            All allergen information
          </Link>
        </p>
      )}
    </div>
  );
}
