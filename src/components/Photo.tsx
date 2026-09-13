import Image from "next/image";
import { IMAGES, type ImageKey } from "@/lib/images";

/**
 * A product photograph, or an honest placeholder when the file is not in the
 * project yet.
 *
 * The placeholder is deliberately a designed empty state rather than a grey
 * box or stock imagery: this is a photography-led site, so a missing photo
 * should be obvious to whoever is reviewing, and should never reach a customer
 * looking like a finished panel.
 */
export function Photo({
  slot,
  className = "",
  sizes = "100vw",
  priority = false,
}: {
  slot: ImageKey;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const image = IMAGES[slot];

  if (!image.present) {
    return (
      <div
        className={`flex items-center justify-center border border-rule bg-ivory ${className}`}
        role="img"
        aria-label={`Photograph pending: ${image.note}`}
      >
        <div className="max-w-[22rem] px-6 py-10 text-center">
          <div className="mx-auto mb-4 h-px w-10 bg-gold" aria-hidden="true" />
          <p className="label-caps">Photograph pending</p>
          <p className="mt-3 text-body-s text-cocoa">{image.note}</p>
          <p className="mt-3 text-body-s text-cocoa">
            <code>{image.src}</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={image.src}
      alt={image.alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
    />
  );
}
