/**
 * Photography manifest tests.
 *
 * Run: npm test
 *
 * The thing worth guarding here is the contract between two files that never
 * see each other: scripts/build-images.mts writes the derivative file names,
 * and src/components/Photo.tsx builds the URLs that ask for them. They agree
 * only because both read this module. If someone changes a width, a format or
 * the naming pattern in one place, the site 404s its own photographs — and it
 * does it silently, because a broken <img> still lays out.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  PHOTOS,
  PHOTO_KEYS,
  PHOTO_WIDTHS,
  PHOTO_FORMATS,
  PHOTO_ASPECT,
  FALLBACK_WIDTH,
  PRODUCT_PHOTOS,
  SOURCE_EXTENSIONS,
  sourceCandidates,
  sourceLabel,
  photoHeight,
  photoUrl,
  photoSrcSet,
  productPhoto,
} from "./images.ts";

describe("derivative naming", () => {
  test("a url is the basename, the width and the extension", () => {
    assert.equal(
      photoUrl("bar-milk-chocolate", 800, "webp"),
      "/images/products/bar-milk-chocolate-800.webp",
    );
  });

  test("a srcset offers every width with its w descriptor", () => {
    const set = photoSrcSet("bonbons-6-piece", "avif");
    assert.equal(set.split(", ").length, PHOTO_WIDTHS.length);
    for (const width of PHOTO_WIDTHS) {
      assert.ok(
        set.includes(`/images/products/bonbons-6-piece-${width}.avif ${width}w`),
        `missing the ${width}w entry`,
      );
    }
  });

  test("the fallback width is one the pipeline actually generates", () => {
    // Otherwise the <img src> — the one every browser falls back to, and the
    // only one a browser without srcset support ever sees — points at a file
    // that was never written.
    assert.ok(PHOTO_WIDTHS.includes(FALLBACK_WIDTH));
  });
});

describe("shape", () => {
  test("heights follow the 4:5 aspect", () => {
    assert.equal(photoHeight(400), 500);
    assert.equal(photoHeight(800), 1000);
    assert.equal(photoHeight(1200), 1500);
  });

  test("every generated width lands on a whole-pixel height", () => {
    // A fractional height would be rounded by sharp and by the browser
    // independently, and the two do not have to agree.
    for (const width of PHOTO_WIDTHS) {
      const exact = (width * PHOTO_ASPECT.h) / PHOTO_ASPECT.w;
      assert.equal(exact, Math.round(exact), `${width} does not divide cleanly`);
    }
  });
});

describe("the manifest itself", () => {
  test("every slot has alt text that is not the file name", () => {
    for (const key of PHOTO_KEYS) {
      const photo = PHOTOS[key];
      assert.ok(photo.alt.length > 20, `${key} has no real alt text`);
      assert.ok(!photo.alt.includes(photo.sourceBase), `${key} alt text is a file name`);
    }
  });

  test("no two slots share a basename", () => {
    // They would overwrite each other in public/images/products/, and the one
    // that lost would still be referenced by the page that wanted it.
    const bases = PHOTO_KEYS.map((key) => PHOTOS[key].base);
    assert.equal(new Set(bases).size, bases.length);
  });

  test("a JPEG fallback format exists", () => {
    // AVIF and WebP are both optional in a browser. JPEG is not.
    assert.ok(PHOTO_FORMATS.some((f) => f.ext === "jpg"));
  });
});

describe("source files", () => {
  test("a base name resolves to every accepted container", () => {
    const candidates = sourceCandidates("logo-atly");
    assert.equal(candidates.length, SOURCE_EXTENSIONS.length);
    assert.ok(candidates.includes("logo-atly.png"));
    assert.ok(candidates.includes("logo-atly.jpg"));
    assert.ok(candidates.includes("logo-atly.jpeg"));
  });

  test("lossless containers are preferred over lossy ones", () => {
    // Order is preference order: the script takes the first one it finds. It
    // matters for the logo, whose background key reads JPEG ringing around
    // the ink as semi-transparent pixels and refuses the cutout.
    const order = SOURCE_EXTENSIONS as readonly string[];
    assert.ok(order.indexOf("png") < order.indexOf("jpg"));
    assert.ok(order.indexOf("tif") < order.indexOf("jpg"));
  });

  test("no slot declares an extension in its base name", () => {
    // It would be looked for as "x.png.png".
    for (const key of PHOTO_KEYS) {
      assert.ok(
        !/.(png|jpe?g|webp|tiff?|avif)$/i.test(PHOTOS[key].sourceBase),
        key + " has an extension in its base name",
      );
    }
  });

  test("the human label does not pick a format for the owner", () => {
    assert.equal(sourceLabel("logo-atly"), "logo-atly.png (or .jpg)");
  });
});

describe("products", () => {
  test("every mapped photograph is a real slot", () => {
    for (const [slug, keys] of Object.entries(PRODUCT_PHOTOS)) {
      assert.ok(keys.length > 0, `${slug} maps to nothing`);
      for (const key of keys) {
        assert.ok(key in PHOTOS, `${slug} maps to unknown slot ${key}`);
      }
    }
  });

  test("the card image is the first of a product's photographs", () => {
    assert.equal(productPhoto("bon-bons"), PRODUCT_PHOTOS["bon-bons"][0]);
    assert.equal(productPhoto("bars"), PRODUCT_PHOTOS["bars"][0]);
  });

  test("a product nobody has photographed returns undefined, not a throw", () => {
    // The shop page renders whatever the catalog holds. A new product added
    // before its photograph arrives must show the frame empty, not 500.
    assert.equal(productPhoto("truffles"), undefined);
  });
});
