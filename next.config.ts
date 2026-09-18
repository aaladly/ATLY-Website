import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * Hostinger serves this as a plain Node process, so there is no platform
 * layer adding any of these. If they are not here, they are nowhere.
 */

/**
 * Content Security Policy.
 *
 * Every entry below is here because something breaks without it. The policy
 * is deliberately tight: this site loads no analytics, no ad pixels and no
 * third-party fonts, so the only foreign origin in the whole document is
 * Stripe.
 *
 * script-src  js.stripe.com          Stripe.js, which mounts the card field
 *                                    and the wallet buttons.
 *             'unsafe-inline'        Next's bootstrap and streamed RSC
 *                                    payloads are inline scripts. A nonce is
 *                                    the better answer, and it needs a
 *                                    middleware that rewrites every response,
 *                                    which is a larger change than this pass.
 *                                    Noted as a real limitation rather than
 *                                    quietly left out.
 * frame-src   js.stripe.com          The card field and both wallet sheets
 *             hooks.stripe.com       are cross-origin iframes. Without this
 *                                    the payment step renders empty.
 * connect-src api.stripe.com         Where Stripe.js confirms the intent.
 * img-src     'self' data: blob:     Our own photography, plus the data: and
 *                                    blob: URIs Next uses for image
 *                                    placeholders.
 * style-src   'unsafe-inline'        Tailwind emits an inline style element,
 *                                    and React inline styles are used for the
 *                                    hero scrims.
 * frame-ancestors 'none'             Nobody frames this site. Same intent as
 *                                    X-Frame-Options, and the modern spelling
 *                                    that browsers actually honour.
 * form-action 'self'                 A form on this site can only post back
 *                                    to it, so an injected form cannot
 *                                    exfiltrate an address to somewhere else.
 * base-uri    'self'                 Stops an injected <base> rewriting every
 *                                    relative URL on the page.
 */
/**
 * React's development build calls eval() for its debugging features —
 * reconstructing a callstack from another environment, chiefly — and says so
 * in the console when a CSP blocks it. It never does this in production.
 *
 * So 'unsafe-eval' is added in development only. The alternative is either a
 * production policy loosened for the sake of a dev tool, or a dev environment
 * with its stack traces broken. Neither is worth it, and the shipped policy
 * is the one below without this line.
 */
const devOnlyEval = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${devOnlyEval} https://js.stripe.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // Everything this site serves is https in production. An http subresource
  // sneaking in should be upgraded rather than silently blocked.
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  /*
    HSTS. Two years, subdomains included, and preload-eligible.

    Worth understanding before changing: once a browser has seen this, it
    refuses to reach this host over http for that long, and there is no way
    to call it back early. That is the point of it, and it is also why it
    should not go on a domain that is not committed to https.
  */
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Superseded by frame-ancestors above, kept for browsers that predate it.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the origin cross-site, the full path same-origin. Enough for a
  // referrer to be useful to us without handing an order URL to anyone else.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  /*
    Permissions-Policy. Everything a chocolate shop has no use for is off.

    payment=(self "https://js.stripe.com") is the exception and it is load
    bearing: the Payment Request API behind Apple Pay and Google Pay is gated
    on this, and an empty payment=() silently removes both wallet buttons
    while leaving the card field working — which is exactly the kind of
    failure nobody notices until a customer mentions it.
  */
  {
    key: "Permissions-Policy",
    value: [
      'payment=(self "https://js.stripe.com")',
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "interest-cohort=()",
      "usb=()",
      "magnetometer=()",
      "accelerometer=()",
      "gyroscope=()",
    ].join(", "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
