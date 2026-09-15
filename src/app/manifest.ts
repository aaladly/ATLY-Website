import type { MetadataRoute } from "next";
import { BUSINESS } from "@/lib/site";
import { logoPresent } from "@/lib/images";

/**
 * The web app manifest.
 *
 * What it is actually for here: a customer who scans the QR code at the market
 * table and adds the shop to their phone's home screen. Without this they get
 * a screenshot of the page as the icon and the page <title> as the label.
 *
 * Not a claim to be an app. `display: browser` on purpose — this is a shop,
 * the address bar is part of trusting it, and hiding the URL on a page that
 * takes a delivery address and a card is the wrong instinct.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BUSINESS.legalName,
    short_name: BUSINESS.tradingName,
    description:
      "Handmade Belgian chocolate from a family business in New Jersey.",
    start_url: "/",
    display: "browser",
    // --color-cream and --color-cocoa-deep from globals.css.
    background_color: "#f8e2c4",
    theme_color: "#4e1901",
    /*
      Only listed once the artwork exists. A manifest that points at an icon
      that is not there is worse than one with no icons: the browser fetches
      it, gets a 404, and falls back to the same screenshot it would have used
      anyway — having spent a request to find out.
    */
    icons: logoPresent()
      ? [
          { src: "/images/icon-32.png", sizes: "32x32", type: "image/png" },
          { src: "/images/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/images/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            // Android crops this to whatever shape the launcher uses. The mark
            // is a circle inside a square of cream, so it survives a circular,
            // squircle or rounded-square mask without losing anything.
            purpose: "maskable",
          },
        ]
      : [],
  };
}
