import type { Metadata } from "next";
import { CartContents } from "@/components/CartContents";

export const metadata: Metadata = {
  title: "Cart",
  description: "Your ATLY order.",
  // A cart is per-visitor and has nothing to index.
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <main>
      <CartContents />
    </main>
  );
}
