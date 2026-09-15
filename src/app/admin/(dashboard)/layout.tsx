import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { SETTINGS_ARE_DURABLE } from "@/lib/settings/store";
import { logoutAction } from "@/app/admin/actions";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products & prices" },
  { href: "/admin/delivery", label: "Delivery" },
];

/**
 * Everything behind the password.
 *
 * The guard is here AND in every Server Action. This one is what a person
 * hits; the ones in the actions are what actually hold, because a Server
 * Action is a public endpoint that can be called without ever loading a page.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-rule-strong bg-ivory">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-5 px-gutter py-5">
          <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
            <Link href="/admin" className="label-caps no-underline">
              ATLY Admin
            </Link>
            <nav aria-label="Admin">
              <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-body-s text-cocoa-deep no-underline hover:text-gold-deep"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-body-s text-cocoa no-underline hover:text-gold-deep"
            >
              View the shop
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-body-s text-cocoa-deep underline underline-offset-4 hover:text-error"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/*
        The durability warning.
        Settings live in memory until Supabase is connected, so a price change
        is real until the server restarts and then it is not. Saying so on
        every admin page is the only honest option: the alternative is an owner
        who changes a price, sees it take effect, and finds it reverted
        tomorrow with no explanation.
        This disappears by itself when SETTINGS_ARE_DURABLE flips.

        It now names ORDERS too, because they are the expensive half. A price
        that reverts is an annoyance the owner can see and redo. An order that
        vanishes is somebody who paid, is expecting chocolate on Saturday, and
        whose address is gone — and nothing anywhere says so. Both flip on the
        same switch, so both are said in the same place.
      */}
      {!SETTINGS_ARE_DURABLE && (
        <div className="border-b border-error bg-ivory">
          <p className="mx-auto max-w-5xl px-gutter py-3 text-body-s">
            <strong className="text-error">Nothing here is saved yet.</strong>{" "}
            Prices, availability, delivery rules{" "}
            <strong>and orders</strong> are held in the server&rsquo;s memory and
            are lost whenever it restarts. Do not take a real order until the
            database is connected.
          </p>
        </div>
      )}

      <main className="mx-auto w-full max-w-5xl flex-1 px-gutter py-12">
        {children}
      </main>
    </div>
  );
}
