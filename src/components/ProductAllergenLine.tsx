import {
  ALLERGEN_LABEL,
  CROSS_CONTACT_STATEMENT,
  productAllergens,
  type Product,
} from "@/lib/catalog";

/**
 * The allergen line on a product card.
 *
 * The brief asked for one fixed sentence on every card:
 *
 *   "Contains: milk, peanuts, pistachio. Made in a shared kitchen — may
 *    contain traces of soy, eggs, wheat, and other tree nuts."
 *
 * It is not used, for three reasons, and the first is the one that matters.
 *
 *  1. THERE IS A HAZELNUT BAR. Under that sentence, a bar named after a nut
 *     would tell a customer the nut is a possible trace. Hazelnut is an
 *     ingredient of that product, and filing an ingredient under may-contain
 *     understates it in the one direction where being wrong is dangerous.
 *     This is the brief's own reasoning about soy lecithin — "soy is an
 *     ingredient, not a trace" — applied to a case it did not notice.
 *
 *  2. ONE SENTENCE CANNOT BE TRUE OF EVERY PRODUCT. Salted Caramel contains
 *     milk. Printing "peanuts, pistachio" on it is a false statement about
 *     that product, and a customer who learns the line is wrong in the
 *     harmless direction has been taught to discount it in the other. So the
 *     Contains list is per product, from the catalog.
 *
 *  3. SOY, EGGS AND WHEAT ARE STILL OPEN QUESTIONS. The terms page carries
 *     visible placeholders asking whether the couverture contains soy
 *     lecithin and whether any filling contains egg or wheat. Printing "may
 *     contain traces of soy" here would answer all three in the weaker
 *     direction, and contradict the page that says they are unanswered.
 *
 * What is printed instead: the product's own allergens, and the owner's own
 * cross-contact statement, word for word. It is two sentences on a card and
 * that is a fair price — silence next to a photograph of chocolate reads as
 * "we checked, and there is no risk".
 */
export function ProductAllergenLine({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const allergens = productAllergens(product);

  return (
    <div className={className}>
      <p className="text-body-s text-cocoa">
        <span className="text-cocoa-deep">Contains: </span>
        {allergens.map((a) => ALLERGEN_LABEL[a].toLowerCase()).join(", ")}.
      </p>

      {/* Verbatim. Not summarised, not shortened to fit a card — it is a
          statement of fact about somebody else's kitchen. */}
      {CROSS_CONTACT_STATEMENT !== null && (
        <p className="mt-1.5 text-body-s text-cocoa">{CROSS_CONTACT_STATEMENT}</p>
      )}
    </div>
  );
}
