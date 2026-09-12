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
  title: "ATLY Belgian Chocolate",
  description:
    "Handmade Belgian chocolate from a family business in New Jersey. Pure chocolate, real ingredients, a bigger purpose.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cormorant.variable} ${workSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
