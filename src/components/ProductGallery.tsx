"use client";

import { useState } from "react";
import { Photo } from "./Photo";
import { PHOTOS, photoPresent, type PhotoKey } from "@/lib/images";

/**
 * The product detail photographs.
 *
 * Built for more angles than exist today, on purpose — there is one photograph
 * of the bars and two of the bon-bons, and more will arrive. With a single
 * photograph it renders exactly one image and no chrome: a lone thumbnail
 * under a picture is a control that does nothing, and a control that does
 * nothing is worse than no control.
 *
 * The thumbnails are real <button>s in a real list, so they tab and they
 * announce. Not a carousel: nothing auto-advances, nothing moves under a
 * thumb, and there is no hidden state to swipe into.
 */
export function ProductGallery({
  photos,
  productName,
  priority = false,
}: {
  photos: readonly PhotoKey[];
  /** Used to name the group, so the buttons are not just "1, 2, 3". */
  productName: string;
  priority?: boolean;
}) {
  // Placeholders are fine to show; a slot with no file is still a slot. But
  // they are never worth a thumbnail, so the strip only counts real ones.
  const [activeIndex, setActiveIndex] = useState(0);
  const active = photos[Math.min(activeIndex, photos.length - 1)];
  const withFiles = photos.filter((key) => photoPresent(key));

  if (photos.length === 0) return null;

  return (
    <div>
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <Photo
          slot={active}
          className="h-full w-full"
          sizes="(min-width: 1024px) 45vw, 100vw"
          priority={priority}
        />
      </div>

      {withFiles.length > 1 && (
        <ul
          className="mt-4 flex flex-wrap gap-3"
          aria-label={`More photographs of ${productName}`}
        >
          {photos.map((key, index) => {
            const isActive = index === activeIndex;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-pressed={isActive}
                  /*
                    The accessible name is the photograph's own description,
                    not "View image 2". Somebody choosing between a six-piece
                    box and a three-piece box of roses needs to know which is
                    which before they commit a tap.
                  */
                  aria-label={`Show: ${PHOTOS[key].alt}`}
                  className={`relative block h-20 w-16 overflow-hidden border-2 transition-colors duration-200 ${
                    isActive
                      ? "border-cocoa-deep"
                      : "border-rule hover:border-cocoa"
                  }`}
                >
                  {/* The button already carries the description. Left
                      exposed, the thumbnail's own alt text would be read out
                      a second time inside it. */}
                  <span aria-hidden="true">
                    <Photo slot={key} className="h-full w-full" sizes="64px" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
