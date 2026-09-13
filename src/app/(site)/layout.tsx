import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { StorefrontSettingsProvider } from "@/components/StorefrontSettings";
import { getStorefrontSettings, toClientSettings } from "@/lib/settings/resolve";

/**
 * The shop.
 *
 * This is also the one place the browser is told what the prices and delivery
 * rules are. Reading the effective settings here rather than in each client
 * component means the shop page, the quantity stepper, the cart and the
 * delivery estimate cannot quote three different numbers after the owner edits
 * a price.
 *
 * Nothing here touches cookies() or headers(), so these pages are still
 * prerendered. Admin saves call revalidatePath() to rebuild them.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getStorefrontSettings();

  return (
    <StorefrontSettingsProvider value={toClientSettings(settings)}>
      {/* Keyboard and screen-reader users should not have to walk the nav
          on every page. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-cocoa-deep focus:px-4 focus:py-2 focus:text-cream"
      >
        Skip to content
      </a>
      <SiteHeader />
      <div id="main" className="flex-1">
        {children}
      </div>
      <SiteFooter delivery={settings.delivery} />
    </StorefrontSettingsProvider>
  );
}
