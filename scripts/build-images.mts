/**
 * Image pipeline.
 *
 *   npm run build:images
 *
 * Reads the full-resolution originals from assets/source/ and writes optimised
 * derivatives into public/. The originals are ~2.5 MB each and must never be
 * served: at that weight one product card costs more than the rest of the page
 * put together, on exactly the phone-on-cellular connection this shop is built
 * for.
 *
 * Everything about WHAT to generate lives in src/lib/images.ts, which the site
 * reads too. This file only knows HOW.
 *
 * It finishes by rewriting src/lib/images.generated.ts with what actually
 * landed on disk, so the components switch from placeholder to photograph
 * without anybody remembering to flip a flag.
 *
 * Flags:
 *   --source DIR   read originals from somewhere else
 *   --public DIR   write derivatives somewhere else
 *   --no-manifest  skip rewriting images.generated.ts (used by the self-test)
 */

import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import {
  PHOTOS,
  PHOTO_KEYS,
  PHOTO_WIDTHS,
  PHOTO_FORMATS,
  PHOTO_ASPECT,
  PHOTO_BUDGET_BYTES,
  FALLBACK_WIDTH,
  LOGO,
  photoHeight,
} from "../src/lib/images.ts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf("--" + name);
  return i === -1 ? undefined : process.argv[i + 1];
};
const has = (name: string): boolean => process.argv.includes("--" + name);

const SOURCE = path.resolve(ROOT, arg("source") ?? "assets/source");
const PUBLIC = path.resolve(ROOT, arg("public") ?? "public");
const PRODUCTS_OUT = path.join(PUBLIC, "images", "products");
const IMAGES_OUT = path.join(PUBLIC, "images");

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

const kb = (bytes: number) => (bytes / 1024).toFixed(0) + " KB";
const problems: string[] = [];
const notes: string[] = [];

const exists = async (file: string) => {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------------------
// Product photographs
// ---------------------------------------------------------------------------

/**
 * Generate every width x format for one photograph.
 *
 * The source is resized with `cover` at the declared 4:5 aspect. A source that
 * arrives at some other shape is centre-cropped rather than squashed, and the
 * mismatch is reported — a distorted chocolate is worse than a tight one, but
 * both are worth knowing about.
 */
async function buildPhoto(key: string): Promise<boolean> {
  const slot = PHOTOS[key as keyof typeof PHOTOS];
  const file = path.join(SOURCE, slot.source);

  if (!(await exists(file))) {
    problems.push("missing source: " + path.relative(ROOT, file));
    return false;
  }

  const input = await readFile(file);
  const meta = await sharp(input).metadata();
  const wanted = PHOTO_ASPECT.w / PHOTO_ASPECT.h;
  const actual = (meta.width ?? 1) / (meta.height ?? 1);
  if (Math.abs(actual - wanted) > 0.01) {
    notes.push(
      slot.source +
        " is " +
        meta.width +
        "x" +
        meta.height +
        " (" +
        actual.toFixed(3) +
        "), not " +
        PHOTO_ASPECT.w +
        ":" +
        PHOTO_ASPECT.h +
        " — it will be centre-cropped, not squashed",
    );
  }

  console.log(
    "\n  " + slot.base + "  (source " + meta.width + "x" + meta.height + ", " + kb(input.length) + ")",
  );

  for (const width of PHOTO_WIDTHS) {
    const height = photoHeight(width);
    const resized = sharp(input).resize(width, height, {
      fit: "cover",
      position: "centre",
    });

    const row: string[] = [];
    for (const format of PHOTO_FORMATS) {
      const pipeline = resized.clone();
      const encoded =
        format.ext === "avif"
          ? pipeline.avif({ quality: format.quality })
          : format.ext === "webp"
            ? pipeline.webp({ quality: format.quality })
            : pipeline.jpeg({ quality: format.quality, mozjpeg: true });

      // sharp drops EXIF, ICC and XMP unless keepMetadata/withMetadata is
      // called. It is not called anywhere in this file, deliberately: these
      // are product photographs shot at home, and the originals may carry the
      // GPS coordinates of a family kitchen.
      const out = await encoded.toBuffer();
      const name = slot.base + "-" + width + "." + format.ext;
      await writeFile(path.join(PRODUCTS_OUT, name), out);
      row.push(format.ext + " " + kb(out.length));

      if (width === FALLBACK_WIDTH && out.length > PHOTO_BUDGET_BYTES) {
        problems.push(
          name + " is " + kb(out.length) + ", over the " + kb(PHOTO_BUDGET_BYTES) + " budget",
        );
      }
    }
    console.log("    " + String(width).padStart(4) + "w  " + row.join("   "));
  }

  return true;
}

// ---------------------------------------------------------------------------
// The logo
// ---------------------------------------------------------------------------

type KeyResult = {
  buffer: Buffer;
  translucency: number;
  fidelity: number;
  /** Mean relative luminance of the ink, 0 black to 1 white. */
  inkLuma: number;
};

/**
 * Key the flat ground out from behind dark line art.
 *
 * The supplied logo is brown artwork printed on one flat cream colour, which
 * is the only situation where this is safe to do automatically.
 *
 * Alpha comes from each pixel's DISTANCE FROM THE GROUND COLOUR, not from how
 * dark it is. That distinction is the whole thing: this mark has pale tan
 * shading in the cacao pod and leaves, and a luminance key reads "pale" as
 * "nearly background" and hands back a 50%-transparent pod that looks fine on
 * cream and like a ghost on the dark footer. By distance, tan is a long way
 * from cream and stays solid; only the actual ground goes.
 *
 * The threshold is a fifth of the way from the ground to the furthest ink, so
 * everything genuinely drawn is opaque and only the anti-aliased rim is
 * partial. The colour is then un-premultiplied, so a rim pixel carries the
 * ink's own colour instead of a cream-tinted blend — that is what avoids the
 * pale halo.
 *
 * Two numbers come back with it, because "did this work" is not something to
 * eyeball on one background:
 *   fidelity     — composite the result back onto the original ground and
 *                  compare. 1.0 means nothing was lost.
 *   translucency — how much of the ink ended up semi-transparent. High means
 *                  the mark will look washed out on a dark surface, which is
 *                  the whole reason for cutting it out in the first place.
 */
async function keyOutBackground(input: Buffer): Promise<KeyResult> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // The ground, from the four corners. A median of four resists one stray
  // pixel; the corners of a centred circular mark are always background.
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ].map(([x, y]) => {
    const i = (y * width + x) * channels;
    return [data[i], data[i + 1], data[i + 2]] as const;
  });
  const bg = [0, 1, 2].map((c) =>
    Math.round(corners.map((p) => p[c]).sort((a, b) => a - b)[1]),
  );

  const distance = (r: number, g: number, b: number) =>
    Math.sqrt((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2);

  let maxDistance = 0;
  for (let i = 0; i < data.length; i += channels) {
    const d = distance(data[i], data[i + 1], data[i + 2]);
    if (d > maxDistance) maxDistance = d;
  }
  // A fifth of the way to the darkest ink. Anything drawn is past it; only the
  // anti-aliased rim lands inside it.
  const threshold = Math.max(1, maxDistance * 0.2);

  const out = Buffer.alloc(width * height * 4);
  let translucent = 0;
  let inked = 0;
  let inkLumaSum = 0;
  let squaredError = 0;

  for (let p = 0, q = 0; p < data.length; p += channels, q += 4) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const a = Math.min(1, distance(r, g, b) / threshold);

    if (a < 0.02) {
      out[q] = 0;
      out[q + 1] = 0;
      out[q + 2] = 0;
      out[q + 3] = 0;
    } else {
      // Un-premultiply: recover the ink colour from a pixel that is a blend
      // of ink and ground.
      out[q] = Math.min(255, Math.max(0, Math.round((r - (1 - a) * bg[0]) / a)));
      out[q + 1] = Math.min(255, Math.max(0, Math.round((g - (1 - a) * bg[1]) / a)));
      out[q + 2] = Math.min(255, Math.max(0, Math.round((b - (1 - a) * bg[2]) / a)));
      out[q + 3] = Math.round(a * 255);
      inked += 1;
      if (a < 0.9) translucent += 1;
      inkLumaSum +=
        (0.2126 * out[q] + 0.7152 * out[q + 1] + 0.0722 * out[q + 2]) / 255;
    }

    // Composite back onto the ground and measure what changed.
    for (let c = 0; c < 3; c += 1) {
      const back = (out[q + c] * a + bg[c] * (1 - a)) / 255;
      squaredError += (back - [r, g, b][c] / 255) ** 2;
    }
  }

  const pixels = width * height;
  return {
    buffer: await sharp(out, { raw: { width, height, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toBuffer(),
    translucency: inked === 0 ? 1 : translucent / inked,
    fidelity: 1 - Math.sqrt(squaredError / (pixels * 3)),
    inkLuma: inked === 0 ? 1 : inkLumaSum / inked,
  };
}

/**
 * A cutout is only worth shipping if it survives being put back where it came
 * from AND the ink stays solid. Either test failing means the cream tile is
 * the better of the two — per the brief, note it rather than ship a halo.
 */
const FIDELITY_FLOOR = 0.99;
const TRANSLUCENCY_CEILING = 0.35;

async function buildLogo(): Promise<{ present: boolean; cutout: boolean }> {
  const file = path.join(SOURCE, LOGO.source);
  if (!(await exists(file))) {
    problems.push("missing source: " + path.relative(ROOT, file));
    return { present: false, cutout: false };
  }

  const input = await readFile(file);
  const meta = await sharp(input).metadata();
  console.log("\n  logo  (source " + meta.width + "x" + meta.height + ", " + kb(input.length) + ")");

  // What the palette in globals.css claims to have been sampled from. Printed
  // so the two can be checked against each other rather than trusted.
  const stats = await sharp(input).stats();
  const d = stats.dominant;
  const hex = [d.r, d.g, d.b].map((v) => v.toString(16).padStart(2, "0")).join("");
  console.log("    dominant ground  #" + hex);

  // --- Header lockup, ground intact ---
  const size = LOGO.headerHeight * 2;
  await sharp(input)
    .resize(size, size, { fit: "contain" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(IMAGES_OUT, LOGO.base + ".png"));

  // --- Header lockup, ground keyed out ---
  const keyed = await keyOutBackground(input);
  const clean =
    keyed.fidelity >= FIDELITY_FLOOR && keyed.translucency <= TRANSLUCENCY_CEILING;

  console.log(
    "    key: fidelity " +
      keyed.fidelity.toFixed(4) +
      " (floor " +
      FIDELITY_FLOOR +
      "), translucency " +
      (keyed.translucency * 100).toFixed(1) +
      "% (ceiling " +
      TRANSLUCENCY_CEILING * 100 +
      "%)",
  );

  if (clean) {
    await sharp(keyed.buffer)
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9 })
      .toFile(path.join(IMAGES_OUT, LOGO.cutoutBase + ".png"));
    console.log("    -> " + LOGO.cutoutBase + ".png (transparent)");
    // A clean key is not the same as a usable logo everywhere. This mark is
    // dark ink; with the cream ground gone there is nothing left to hold it
    // apart from a dark surface, and it all but disappears on the footer.
    if (keyed.inkLuma < 0.5) {
      notes.push(
        "the cutout is clean, but the mark is dark ink (mean luminance " +
          keyed.inkLuma.toFixed(2) +
          "). Use it on light surfaces only — on the cocoa-deep footer it is " +
          "nearly invisible, and fixing that needs an inverted version drawn " +
          "from the original artwork, not anything this script can do.",
      );
    }
  } else {
    notes.push(
      "the logo's background could not be keyed out cleanly, so the cream " +
        "version is what the site will use. A haloed cutout on a dark surface " +
        "is worse than a cream tile — this one needs a designer with the " +
        "original artwork.",
    );
  }

  // --- Favicons ---
  // Kept on the cream ground on purpose: a transparent favicon inherits
  // whatever the browser's tab colour is, and dark-mode Chrome would put dark
  // brown ink on near-black.
  const icons: [string, number][] = [
    ["icon-32.png", 32],
    ["apple-touch-icon.png", 180],
    ["icon-512.png", 512],
  ];
  for (const [name, px] of icons) {
    await sharp(input)
      .resize(px, px, { fit: "contain" })
      .png({ compressionLevel: 9 })
      .toFile(path.join(IMAGES_OUT, name));
  }
  console.log("    -> icon-32.png, apple-touch-icon.png, icon-512.png");

  // --- Open Graph card: the mark centred on the brand cream ---
  const ogLogo = await sharp(input).resize(520, 520, { fit: "contain" }).toBuffer();
  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      // --color-cream, the value in globals.css.
      background: { r: 0xf8, g: 0xe2, b: 0xc4, alpha: 1 },
    },
  })
    .composite([{ input: ogLogo, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(IMAGES_OUT, "og-logo.png"));
  console.log("    -> og-logo.png (1200x630)");

  return { present: true, cutout: clean };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

await mkdir(PRODUCTS_OUT, { recursive: true });
await mkdir(IMAGES_OUT, { recursive: true });

console.log("\nATLY image pipeline");
console.log("  from " + (path.relative(ROOT, SOURCE) || "."));
console.log("  to   " + (path.relative(ROOT, PUBLIC) || "."));

const built: string[] = [];
for (const key of PHOTO_KEYS) {
  if (await buildPhoto(key)) built.push(PHOTOS[key].base);
}
const logo = await buildLogo();

if (!has("no-manifest")) {
  const lines = built.map((b) => "  " + JSON.stringify(b) + ",").join("\n");
  const generated =
    "/**\n" +
    " * GENERATED by `npm run build:images`. Do not edit by hand.\n" +
    " *\n" +
    " * It records what is actually on disk in public/images/, so that a component\n" +
    " * never has to guess and never renders a broken <img>. Checked in on purpose:\n" +
    " * the site must build correctly from a fresh clone without running the image\n" +
    " * pipeline first.\n" +
    " */\n\n" +
    "export const GENERATED_PHOTOS: readonly string[] = [\n" +
    lines +
    (lines ? "\n" : "") +
    "];\n\n" +
    "export const GENERATED_LOGO = {\n" +
    "  present: " +
    logo.present +
    ",\n  cutout: " +
    logo.cutout +
    ",\n} as const;\n";

  await writeFile(path.join(ROOT, "src/lib/images.generated.ts"), generated);
  console.log(
    "\n  manifest: " +
      built.length +
      "/" +
      PHOTO_KEYS.length +
      " photographs, logo " +
      (logo.present ? "present" : "missing"),
  );
}

for (const note of notes) console.log("\n  note: " + note);

if (problems.length > 0) {
  console.error("\n" + problems.length + " problem" + (problems.length === 1 ? "" : "s") + ":");
  for (const p of problems) console.error("  - " + p);
  console.error(
    "\nPut the originals in " +
      path.relative(ROOT, SOURCE) +
      "/ under the names in src/lib/images.ts and run this again.\n",
  );
  process.exit(1);
}

console.log("\nDone.\n");
