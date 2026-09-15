/**
 * Is this site ready to take money from a stranger?
 *
 *   npm run check:launch
 *
 * Exits non-zero while anything is still missing, so it can sit in front of a
 * deploy. Every check here is something that, left undone, either breaks an
 * order or misleads a customer — the list is not a wish list, it is the set of
 * things that have to be true before the first real person presses Place
 * order.
 *
 * BLOCKERS stop a launch. WARNINGS are things to know about; the site works
 * without them.
 *
 * This reads the environment exactly the way Next does, through @next/env, so
 * a value mangled by dotenv's variable expansion is caught here rather than at
 * two in the morning when nobody can sign in to the admin.
 */

import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), true, { info: () => {}, error: () => {} });

// Imported AFTER the env is loaded: these modules read process.env when they
// are first evaluated.
const { SITE_URL, SITE_URL_IS_PLACEHOLDER, LEGAL_REVIEWED, BUSINESS } =
  await import("../src/lib/site.ts");
const {
  PRODUCTS,
  CROSS_CONTACT_STATEMENT,
  variantsMissingIngredients,
  variantsMissingTreeNutVarieties,
} = await import("../src/lib/catalog.ts");
const { DELIVERY_CONFIG } = await import("../src/config/delivery.ts");
const { missingPhotos, logoPresent, PHOTOS, sourceLabel } = await import(
  "../src/lib/images.ts"
);

const env = (name) => {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "";
};

const blockers = [];
const warnings = [];

/** @param {boolean} ok */
const require_ = (ok, label, fix) => {
  if (!ok) blockers.push({ label, fix });
  return ok;
};
const prefer = (ok, label, fix) => {
  if (!ok) warnings.push({ label, fix });
  return ok;
};

// ---------------------------------------------------------------------------
// Where the site lives
// ---------------------------------------------------------------------------

require_(
  !SITE_URL_IS_PLACEHOLDER,
  "The site has no real address",
  "Set NEXT_PUBLIC_SITE_URL in .env.local. Until then every canonical link, " +
    "Open Graph image and sitemap entry points at localhost, and the site " +
    "tells search engines not to index it.",
);

// ---------------------------------------------------------------------------
// Taking an order
// ---------------------------------------------------------------------------

require_(
  env("STRIPE_SECRET_KEY") && env("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  "Online payment is not switched on",
  "Add your Stripe keys. Checkout currently validates an order completely " +
    "and then refuses it, so nothing can be sold.",
);

prefer(
  env("STRIPE_WEBHOOK_SECRET"),
  "No Stripe webhook secret",
  "Needed to confirm payments asynchronously. Without it an order can sit in " +
    "awaiting_payment after the customer has actually paid.",
);

require_(
  env("NEXT_PUBLIC_SUPABASE_URL") && env("SUPABASE_SERVICE_ROLE_KEY"),
  "No database",
  "Orders and admin settings are held in memory. On a single long-running " +
    "Node process they at least survive between requests, but a restart or a " +
    "redeploy loses every order taken since the last one -- and nobody is " +
    "watching for that.",
);

prefer(
  env("RESEND_API_KEY") &&
    env("ORDER_CONFIRMATION_FROM_EMAIL") &&
    env("ORDER_NOTIFICATION_TO_EMAIL"),
  "No confirmation email",
  "Add the Resend key and both addresses, or a customer pays and hears " +
    "nothing back.",
);

// ---------------------------------------------------------------------------
// The admin
// ---------------------------------------------------------------------------

require_(
  env("ADMIN_PASSWORD_HASH") && env("ADMIN_SESSION_SECRET"),
  "The admin has no password",
  "Run `npm run admin:password` and `npm run admin:secret`. Nobody can sign " +
    "in without both — including the owner.",
);

if (env("ADMIN_PASSWORD_HASH")) {
  require_(
    /^scrypt:\d+:\d+:\d+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/.test(
      process.env.ADMIN_PASSWORD_HASH.trim(),
    ),
    "The admin password hash is malformed",
    "It should look like scrypt:16384:8:1:<salt>:<hash>. A hash containing " +
      "$ is rewritten by dotenv's variable expansion on the way in, and the " +
      "password then silently never works. Regenerate it with " +
      "`npm run admin:password`.",
  );
}

// ---------------------------------------------------------------------------
// What a customer is told
// ---------------------------------------------------------------------------

const missingIngredients = variantsMissingIngredients(PRODUCTS);

require_(
  missingIngredients.length === 0,
  `${missingIngredients.length} flavor${missingIngredients.length === 1 ? " has" : "s have"} no ingredient list`,
  `Waiting on: ${missingIngredients.join(", ")}. These come from the owner, ` +
    "from the actual recipes — never from guesswork. Someone with an allergy " +
    "reads them and decides whether to eat.",
);

const unnamedNuts = variantsMissingTreeNutVarieties(PRODUCTS);

prefer(
  unnamedNuts.length === 0,
  `${unnamedNuts.length} flavor${unnamedNuts.length === 1 ? " declares" : "s declare"} tree nuts without naming them`,
  `Waiting on: ${unnamedNuts.join(", ")}. "Mixed" is a marketing word, not an ` +
    "allergen statement — somebody who reacts to cashew and not to almond " +
    "cannot act on it. The site no longer shows this gap to customers, so " +
    "this line is the only place it is recorded. Name them in " +
    "src/lib/catalog.ts and it clears itself.",
);

require_(
  CROSS_CONTACT_STATEMENT !== null,
  "No shared-kitchen statement",
  "This kitchen handles peanuts and tree nuts. The statement is a fact about " +
    "how the kitchen works, so the owner writes it. Until they do, the " +
    "allergen page says plainly that we are not claiming it is safe.",
);

const { LEGAL_PLACEHOLDERS } = await import("../src/lib/legal.ts");

require_(
  LEGAL_PLACEHOLDERS.length === 0,
  `${LEGAL_PLACEHOLDERS.length} detail${LEGAL_PLACEHOLDERS.length === 1 ? "" : "s"} missing from the legal pages`,
  `Still to settle: ${LEGAL_PLACEHOLDERS.join("; ")}. Each one renders on ` +
    "/terms as a visible marker rather than being guessed at — a terms page " +
    "is a contract, and a plausible-sounding guess in one is a promise nobody " +
    "made. Fill them in in src/lib/legal.ts and on the page.",
);

require_(
  LEGAL_REVIEWED,
  "The privacy, terms and refund pages are unreviewed drafts",
  "They are accurate about what the code does, but several commercial terms " +
    "are still marked undecided and nobody qualified has read them. Fill in " +
    "the gaps, have them reviewed, then flip LEGAL_REVIEWED in src/lib/site.ts.",
);

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

require_(
  DELIVERY_CONFIG.freeCountyZipsVerified,
  "The free-delivery ZIP list has not been checked",
  `${DELIVERY_CONFIG.freeCountyZips.length} ZIP codes decide who pays for ` +
    "delivery and who does not. The list is a best-effort draft that has " +
    "never been checked against USPS. Check it, then flip " +
    "freeCountyZipsVerified in src/config/delivery.ts.",
);

const unweighed = PRODUCTS.flatMap((product) =>
  product.variants
    .filter((variant) => variant.packagedWeightOz === null)
    .map((variant) => `${product.name} — ${variant.name}`),
);

prefer(
  unweighed.length === 0,
  `${unweighed.length} flavor${unweighed.length === 1 ? " has" : "s have"} no packaged weight`,
  "Not a blocker: delivery is a flat rate and works fine. But weight-based " +
    "pricing cannot be switched on until every one is weighed. Enter them at " +
    "/admin/products.",
);

// ---------------------------------------------------------------------------
// What it looks like
// ---------------------------------------------------------------------------

const missing = missingPhotos();

require_(
  missing.length === 0,
  `${missing.length} photograph${missing.length === 1 ? "" : "s"} missing`,
  "This is a photography-led site and each missing slot renders a " +
    '"Photograph pending" placeholder: ' +
    missing.map((key) => sourceLabel(PHOTOS[key].sourceBase)).join(", ") +
    ". Put the originals in assets/source/ and run: npm run build:images",
);

prefer(
  logoPresent(),
  "No logo artwork",
  "assets/source/logo-atly.png (or .jpg) is missing, so the favicon, the " +
    "apple touch " +
    "icon and the link-preview card are still generated from type rather than " +
    "from the real mark. npm run build:images produces all of them.",
);

prefer(
  BUSINESS.contactEmail !== null,
  "No public contact email",
  "The refunds page tells customers to message on Instagram, which is the " +
    "honest answer today but not a good one for an order problem.",
);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const line = "=".repeat(78);
const rule = "-".repeat(78);

const wrap = (text, indent) => {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > 78 - indent.length) {
      lines.push(current.trim());
      current = word;
    } else {
      current += ` ${word}`;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines.map((l) => indent + l).join("\n");
};

console.log(`\n${line}`);
console.log("  ATLY — launch readiness");
console.log(`  ${SITE_URL}`);
console.log(line);

if (blockers.length > 0) {
  console.log("\nNOT READY — these have to be done first");
  console.log(rule);
  for (const item of blockers) {
    console.log(`\n  ✗  ${item.label}`);
    console.log(wrap(item.fix, "     "));
  }
}

if (warnings.length > 0) {
  console.log("\n\nWorth knowing — the site works without these");
  console.log(rule);
  for (const item of warnings) {
    console.log(`\n  !  ${item.label}`);
    console.log(wrap(item.fix, "     "));
  }
}

console.log(`\n${line}`);

if (blockers.length === 0 && warnings.length === 0) {
  console.log("  Ready. Nothing outstanding.");
  console.log(`${line}\n`);
  process.exit(0);
}

if (blockers.length === 0) {
  console.log(
    `  Ready to launch, with ${warnings.length} thing${warnings.length === 1 ? "" : "s"} worth knowing.`,
  );
  console.log(`${line}\n`);
  process.exit(0);
}

console.log(
  `  ${blockers.length} blocker${blockers.length === 1 ? "" : "s"}. Do not launch yet.`,
);
console.log(`${line}\n`);
process.exit(1);
