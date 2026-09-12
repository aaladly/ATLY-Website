import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATLY Belgian Chocolate",
  description:
    "Handmade Belgian chocolate from a family business in New Jersey. Pure chocolate, real ingredients, a bigger purpose.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
