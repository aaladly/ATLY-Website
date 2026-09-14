import { NotFoundContent } from "@/components/NotFound";

/**
 * A notFound() thrown inside the shop — most often a product slug that does
 * not exist. Renders inside the site layout, so the header, the nav and the
 * footer are all still there to leave by.
 */
export default function SiteNotFound() {
  return (
    <main>
      <NotFoundContent />
    </main>
  );
}
