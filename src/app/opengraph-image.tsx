import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { logoPresent } from "@/lib/images";

/**
 * The link-preview card.
 *
 * Two versions of the same card, and which one is served depends on whether
 * the logo artwork has been through `npm run build:images` yet.
 *
 * WITH the logo: the mark centred on the brand cream, which is what
 * og-logo.png already is at exactly 1200x630 — so it is served as-is rather
 * than rebuilt here.
 *
 * WITHOUT it: type only, on the brand's own colours. Deliberately not a
 * photograph even once the product shots exist. A link preview is the one
 * image somebody sees before they have seen anything else, and a single
 * chocolate out of context says less about this business than its name does.
 *
 * The face is whatever @vercel/og bundles rather than Cormorant: pulling the
 * real display font in would mean a network fetch during the build, and a
 * build that can fail because a font CDN is slow is a bad trade. Letterspaced
 * caps do most of the work regardless.
 */

export const alt =
  "ATLY Belgian Chocolate — handmade Belgian chocolate in New Jersey";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COCOA_DEEP = "#4e1901";
const CREAM = "#f8e2c4";
const GOLD = "#a67c3d";

export default async function Image() {
  if (logoPresent()) {
    // Already the right size and the right colour. Re-drawing it through
    // ImageResponse would only re-encode it and risk a rounding difference in
    // how the mark sits on the ground.
    const card = await readFile(
      join(process.cwd(), "public", "images", "og-logo.png"),
    );
    return new Response(new Uint8Array(card), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, immutable, no-transform, max-age=31536000",
      },
    });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COCOA_DEEP,
          color: CREAM,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 124,
            letterSpacing: 28,
            // Letterspacing adds trailing space after the last letter, which
            // pushes an otherwise centred wordmark visibly left.
            paddingLeft: 28,
            fontWeight: 400,
          }}
        >
          ATLY
        </div>

        <div
          style={{
            display: "flex",
            width: 220,
            height: 2,
            backgroundColor: GOLD,
            marginTop: 34,
            marginBottom: 34,
          }}
        />

        <div
          style={{
            display: "flex",
            fontSize: 30,
            letterSpacing: 14,
            paddingLeft: 14,
            color: CREAM,
          }}
        >
          BELGIAN CHOCOLATE
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 28,
            marginTop: 64,
            color: GOLD,
          }}
        >
          Pure chocolate. Real ingredients. A bigger purpose.
        </div>
      </div>
    ),
    size,
  );
}
