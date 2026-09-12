/**
 * The ATLY brand palette and type scale, as data.
 *
 * Single source for anything that needs to *describe* the tokens (the
 * styleguide). The tokens themselves are declared in src/app/globals.css
 * under @theme — these hex values must match that file.
 */

export type Swatch = {
  /** Tailwind token name, e.g. "cocoa-deep" -> bg-cocoa-deep / text-cocoa-deep */
  token: string;
  hex: string;
  name: string;
  usage: string;
  /** Where this color is legitimately used as text or a UI edge. */
  on: string[];
  /**
   * The text size this color is approved at on those surfaces.
   * "large" means >=24px, or >=18.66px bold — the 3:1 threshold. Antique Gold
   * is the only one that needs it: it carries 3.81:1 on Cocoa Deep, which is
   * fine for display headings and not fine for body copy.
   */
  textSize?: "body" | "large";
  origin: "sampled" | "derived" | "added";
};

export const SURFACES = {
  cream: "#f8e2c4",
  ivory: "#fdf5ea",
  cocoaDeep: "#4e1901",
} as const;

export const PALETTE: Swatch[] = [
  {
    token: "cocoa-deep",
    hex: "#4e1901",
    name: "Cocoa Deep",
    usage: "Primary text. Dark surfaces. Primary button fill.",
    on: ["cream", "ivory"],
    origin: "sampled",
  },
  {
    token: "cream",
    hex: "#f8e2c4",
    name: "Cream",
    usage: "Page base. Text and focus ring on dark surfaces.",
    on: ["cocoaDeep"],
    origin: "sampled",
  },
  {
    token: "cocoa",
    hex: "#7a4a2b",
    name: "Cocoa",
    usage: "Secondary text. Input borders. Cacao illustration tone.",
    on: ["cream", "ivory"],
    origin: "derived",
  },
  {
    token: "ivory",
    hex: "#fdf5ea",
    name: "Ivory",
    usage: "Cards and raised panels sitting on the cream base.",
    on: ["cocoaDeep"],
    origin: "derived",
  },
  {
    token: "gold-deep",
    hex: "#7e5822",
    name: "Gold Deep",
    usage: "The functional gold: small-caps labels, links, focus rings. Light surfaces only.",
    on: ["cream", "ivory"],
    origin: "derived",
  },
  {
    token: "gold",
    hex: "#a67c3d",
    name: "Antique Gold",
    usage: "Ornament on light surfaces. Large display accents on dark. Never body text.",
    on: ["cocoaDeep"],
    textSize: "large",
    origin: "derived",
  },
  {
    token: "error",
    hex: "#8c2b12",
    name: "Oxblood",
    usage: "Form validation only. Kept inside the brown family — not a bright accent.",
    on: ["cream", "ivory"],
    origin: "added",
  },
];

export const ORNAMENT: Swatch[] = [
  {
    token: "rule",
    hex: "#d8bc92",
    name: "Rule",
    usage: "Faintest hairline. Decorative — carries no information.",
    on: [],
    origin: "derived",
  },
  {
    token: "rule-strong",
    hex: "#c9a87a",
    name: "Rule Strong",
    usage: "Visible divider between sections.",
    on: [],
    origin: "derived",
  },
];



export type TypeSpec = {
  token: string;
  px: string;
  family: "display" | "body";
  role: string;
  /** Literal class string. Tailwind v4 scans source for whole class names,
   *  so this can never be built from a template literal. */
  className: string;
};

export const TYPE_SCALE: TypeSpec[] = [
  { token: "display-xl", px: "64px", family: "display", role: "Hero headline",   className: "text-display-xl font-display" },
  { token: "display-l",  px: "48px", family: "display", role: "Page title",      className: "text-display-l font-display" },
  { token: "display-m",  px: "36px", family: "display", role: "Section heading", className: "text-display-m font-display" },
  { token: "display-s",  px: "24px", family: "display", role: "Card heading",    className: "text-display-s font-display" },
  { token: "body-l",     px: "18px", family: "body",    role: "Lead paragraph",  className: "text-body-l font-body" },
  { token: "body-m",     px: "16px", family: "body",    role: "Default body",    className: "text-body-m font-body" },
  { token: "body-s",     px: "14px", family: "body",    role: "Caption, help text", className: "text-body-s font-body" },
  { token: "label",      px: "12px", family: "body",    role: "Small-caps label", className: "label-caps" },
];
