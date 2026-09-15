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

  /**
   * The heading level depends on where this is rendered.
   *
   * On /allergens these sections sit directly under the page's h1, so they are
   * h2. Inside a product page they sit under that page's "Allergens" h2, so
   * they are h3. Hardcoding either one leaves a skipped level on the other
   * page, which is how a screen-reader user loses the outline.
   */
  const Heading = compact ? "h3" : "h2";
  const headingClass = compact ? "label-caps" : "text-display-s";

  return (
    <div className={compact ? "" : "space-y-10"}>
      {products.map((product) => (
        <section key={product.slug} className={compact ? "mt-5 first:mt-0" : ""}>
          {/* The compact variant sits inside a product page's own "Allergens"
              section, which has already said which product this is. Repeating
              the name adds a heading level and no information. */}
          {!compact && <Heading className={headingClass}>{product.name}</Heading>}

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

                {/* "Tree nuts" is not enough for somebody who reacts to one
                    nut and not another, so the varieties are named wherever
                    they are known.

                    Where they are not — the Mixed Nuts bar — this line is
                    simply absent. It used to carry a visible "still to be
                    named" marker, which was a note to ourselves showing up on
                    a customer's page. Nothing is understated by its removal:
                    the flavor is still declared as containing tree nuts,
                    which is the allergen statement that matters, and the
                    shared-kitchen statement below still applies. The gap is
                    tracked on the owner's launch checklist instead. */}
                {variant.containsAllergens.includes("tree_nuts") &&
                  variant.treeNutVarieties !== null && (
                    <p className="mt-1 text-body-s">
                      <span className="text-cocoa">The tree nuts are: </span>
                      {variant.treeNutVarieties.join(", ")}
                    </p>
                  )}

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
        <Heading className={headingClass}>Made in a shared kitchen</Heading>

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
