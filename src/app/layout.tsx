import type { Metadata } from "next";
import { Cormorant_Garamond, Work_Sans } from "next/font/google";
import { SITE_URL, SITE_URL_IS_PLACEHOLDER } from "@/lib/site";
import "./globals.css";

// Serif display, matching the logo's classical serif treatment.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

// Humanist sans for body copy — high contrast against the display serif.
const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-work-sans",
  display: "swap",
});

const DESCRIPTION =
  "Handmade Belgian chocolate from a family business in New Jersey. Pure chocolate, real ingredients, a bigger purpose.";

export const metadata: Metadata = {
  // Every relative URL in metadata below — canonicals, OG images — is resolved
  // against this. Without it, a relative field is a build error. See
  // src/lib/site.ts for why there is no invented default.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ATLY Belgian Chocolate",
    template: "%s — ATLY Belgian Chocolate",
  },
  description: DESCRIPTION,
  applicationName: "ATLY Belgian Chocolate",
  keywords: [
    "Belgian chocolate",
    "handmade chocolate",
    "bon-bons",
    "chocolate bars",
    "New Jersey",
    "Hunterdon County",
    "chocolate delivery",
  ],
  /**
   * Only what is genuinely the same on every page.
   *
   * No title, description or url here on purpose. Metadata in a layout is
   * inherited wholesale by any page that does not override it, so setting them
   * gave the About page, the allergen page and every legal page the same link
   * preview as the home page. Left out, Next falls back to each page's own
   * title and description, which is what a shared link should say.
   *
   * The og:image comes from src/app/opengraph-image.tsx and is attached
   * automatically — but ONLY to an openGraph object it can merge into. A page
   * that declares its own `openGraph` REPLACES this one wholesale and loses
   * the image, the site name and the locale with it. That is why no page in
   * this project declares one, and why og:url is absent: setting it per page
   * would cost the image on every page that did. The canonical link is there
   * and does the same job.
   */
  openGraph: {
    type: "website",
    siteName: "ATLY Belgian Chocolate",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  /**
   * Indexing is off while the site has no real address configured.
   *
   * A build without NEXT_PUBLIC_SITE_URL emits localhost canonicals and
   * localhost Open Graph images. Being indexed in that state is worse than not
   * being indexed at all — the wrong URLs are cheap to avoid and expensive to
   * unpick once a crawler has them. `npm run check:launch` refuses to pass
   * while this is the case.
   */
  robots: SITE_URL_IS_PLACEHOLDER
    ? { index: false, follow: false }
    : { index: true, follow: true },
};

/**
 * The HTML shell, and nothing else.
 *
 * The shop's header, footer and skip link moved to src/app/(site)/layout.tsx
 * in Step 9, when the admin arrived. An order-management screen wearing the
 * shop's navigation is a screen where "Add to cart" sits next to "Mark
 * delivered", and the footer advertises delivery rates at someone who is
 * trying to pack a box. The two are different tools and now have different
 * chrome; the URLs did not change.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cormorant.variable} ${workSans.variable}`}>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
