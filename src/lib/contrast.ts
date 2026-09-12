/**
 * WCAG 2.1 relative luminance and contrast ratio.
 *
 * Pure — no React, no I/O. Mirrored by scripts/contrast.mjs, which runs the
 * same math as a standalone audit (`npm run check:contrast`). If the formula
 * changes here, change it there too.
 */

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
};

const luminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Contrast ratio between two hex colors, 1–21. Order-independent. */
export const contrastRatio = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** WCAG AA verdict for a ratio at a given text size. */
export const aaVerdict = (
  r: number,
  size: "body" | "large" = "body",
): "AAA" | "AA" | "fail" => {
  const need = size === "large" ? 3 : 4.5;
  if (r >= 7) return "AAA";
  return r >= need ? "AA" : "fail";
};
