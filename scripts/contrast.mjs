// WCAG 2.1 contrast checker for the ATLY palette.
// Ratio = (L_light + 0.05) / (L_dark + 0.05), luminance per WCAG relative-luminance.
// Thresholds: 4.5 body text · 3.0 large text (>=24px, or >=18.66px bold) and UI components.
// Run: npm run check:contrast

const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// The palette. Keep in sync with @theme in src/app/globals.css.
const P = {
  cocoaDeep: "#4E1901", // given  — wordmark brown: primary text, dark surfaces
  cream:     "#F8E2C4", // given  — logo background: page base
  cocoa:     "#7A4A2B", // derived — cacao illustration mid-brown: secondary text
  ivory:     "#FDF5EA", // derived — cards and panels
  gold:      "#A67C3D", // derived — ornament on light; large-text accent on dark (3.81:1)
  goldDeep:  "#7E5822", // derived — functional gold on LIGHT surfaces only: labels, links, focus
  rule:      "#D8BC92", // derived — hairline rules on cream
  error:     "#8C2B12", // added   — form validation (spec has no state color)
};

let failures = 0;

const check = (label, fg, bg, need) => {
  const r = ratio(fg, bg);
  const ok = r >= need;
  if (!ok) failures++;
  const tag = ok ? "PASS" : "FAIL";
  console.log(
    `${tag}  ${r.toFixed(2).padStart(5)}:1  (need ${need.toFixed(1)})  ${label.padEnd(38)} ${fg} on ${bg}`
  );
};

const group = (title) => console.log(`\n${title}\n${"-".repeat(94)}`);

group("Body text — need 4.5");
check("primary text on page base",      P.cocoaDeep, P.cream, 4.5);
check("primary text on card",           P.cocoaDeep, P.ivory, 4.5);
check("secondary text on page base",    P.cocoa,     P.cream, 4.5);
check("secondary text on card",         P.cocoa,     P.ivory, 4.5);
check("link / label on page base",      P.goldDeep,  P.cream, 4.5);
check("link / label on card",           P.goldDeep,  P.ivory, 4.5);
check("error text on page base",        P.error,     P.cream, 4.5);
check("error text on card",             P.error,     P.ivory, 4.5);

group("Inverted text on dark surfaces — need 4.5");
check("cream on cocoa deep",            P.cream,     P.cocoaDeep, 4.5);
check("ivory on cocoa deep",            P.ivory,     P.cocoaDeep, 4.5);

group("Buttons — need 4.5 for labels");
check("primary btn label",              P.cream,     P.cocoaDeep, 4.5);
check("secondary btn label on cream",   P.cocoaDeep, P.cream,     4.5);
check("secondary btn label on ivory",   P.cocoaDeep, P.ivory,     4.5);

group("Non-text UI: borders, focus rings, control edges — need 3.0");
check("focus ring on page base",        P.goldDeep,  P.cream,     3.0);
check("focus ring on card",             P.goldDeep,  P.ivory,     3.0);
check("focus ring on dark surface",     P.cream,     P.cocoaDeep, 3.0);
check("input border on page base",      P.cocoa,     P.cream,     3.0);
check("input border on card",           P.cocoa,     P.ivory,     3.0);
check("error border on page base",      P.error,     P.cream,     3.0);
check("btn outline on page base",       P.cocoaDeep, P.cream,     3.0);

group("Large display text only (>=24px) — need 3.0");
check("gold accent heading on cocoa deep", P.gold,  P.cocoaDeep, 3.0);

group("Decorative only — exempt from WCAG 1.4.11, listed for honesty");
const dec = (label, fg, bg) =>
  console.log(`----  ${ratio(fg, bg).toFixed(2).padStart(5)}:1  (exempt)     ${label.padEnd(38)} ${fg} on ${bg}`);
dec("gold ornament on page base",   P.gold, P.cream);
dec("gold ornament on cocoa deep",  P.gold, P.cocoaDeep);
dec("hairline rule on page base",   P.rule, P.cream);

console.log(`\n${"=".repeat(94)}`);
console.log(failures === 0
  ? "All non-decorative pairings meet their WCAG AA threshold."
  : `${failures} pairing(s) BELOW threshold — fix before shipping.`);
process.exit(failures === 0 ? 0 : 1);
