import type { Metadata } from "next";
import { Cormorant_Garamond, Work_Sans } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "ATLY Belgian Chocolate",
    template: "%s — ATLY Belgian Chocolate",
  },
  description:
    "Handmade Belgian chocolate from a family business in New Jersey. Pure chocolate, real ingredients, a bigger purpose.",
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
