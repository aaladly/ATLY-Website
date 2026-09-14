import { ImageResponse } from "next/og";

/**
 * The link-preview card.
 *
 * Type only, on the brand's own colours. Deliberately not a photograph: there
 * are no product photographs in this project yet, and a link preview is the
 * one image a customer sees before they have seen anything else. A stock
 * chocolate photo would be a lie about what they are getting.
 *
 * TODO: replace with a real product photograph once logoandprodpics.zip is in
 * public/images/. Dropping an opengraph-image.jpg next to this file is enough
 * — a literal image file wins over a generated one.
 *
 * The face is whatever @vercel/og bundles rather than Cormorant: pulling the
 * real display font in would mean a network fetch during the build, and a
 * build that can fail because a font CDN is slow is a bad trade for a card
 * that is about to be replaced by a photograph anyway. Letterspaced caps do
 * most of the work regardless.
 */

export const alt =
  "ATLY Belgian Chocolate — handmade Belgian chocolate in New Jersey";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COCOA_DEEP = "#4e1901";
const CREAM = "#f8e2c4";
const GOLD = "#a67c3d";

export default function Image() {
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
