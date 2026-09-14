/**
 * Page audit — paste this into the browser console on any page of the site.
 *
 * Not wired to an npm script on purpose: the interesting checks (tap target
 * size, horizontal overflow, computed heading outline) need a real browser
 * with a real viewport, and adding a headless browser as a dependency to run
 * them occasionally is a poor trade for a site this size.
 *
 * How to use it:
 *   1. npm run dev
 *   2. Open a page, open devtools, paste this whole file into the console
 *   3. __audit()
 *
 * It returns { url, n, P } where P is the list of problems. n === 0 is clean.
 * Worth running on a phone-sized viewport as well as a desktop one — the
 * primary customer is on a phone at a market table, and tap targets and
 * overflow only misbehave there.
 *
 * What it checks:
 *   - exactly one h1 in <main>, and no skipped heading levels
 *   - every <img> has an alt attribute (empty is fine; missing is not)
 *   - every link and button has an accessible name
 *   - every form control has a label
 *   - no duplicate ids
 *   - exactly one <main>, and every <nav> labelled when there is more than one
 *   - tap targets at least 40px, measuring the wrapping <label> for a
 *     checkbox or radio, since that is the real target
 *   - no horizontal page overflow
 *   - <html lang> and a <title>
 *
 * Colour contrast is NOT here — `npm run check:contrast` covers the palette
 * properly, against the tokens rather than against whatever is on screen.
 */

window.__audit = () => {
  const P = [];
  const add = (kind, detail) => P.push(`${kind}: ${detail}`);
  const name = (el) =>
    (el.getAttribute("aria-label") || el.innerText || el.title || "").trim();

  // --- Headings ---
  const headings = [
    ...document.querySelectorAll("main h1, main h2, main h3, main h4, main h5, main h6"),
  ];
  const h1s = headings.filter((h) => h.tagName === "H1");
  if (h1s.length !== 1) add("h1-count", h1s.length);
  let previous = 0;
  for (const h of headings) {
    const level = Number(h.tagName[1]);
    if (previous && level > previous + 1) {
      add("heading-skip", `h${previous}->h${level} @ ${h.innerText.trim().slice(0, 30)}`);
    }
    previous = level;
  }

  // --- Images ---
  for (const img of document.querySelectorAll("img")) {
    if (img.getAttribute("alt") === null) add("img-no-alt", img.src.slice(-40));
  }

  // --- Accessible names ---
  for (const el of document.querySelectorAll("a[href], button")) {
    if (name(el) === "" && !el.closest('[aria-hidden="true"]')) {
      add("no-name", `${el.tagName} ${el.getAttribute("href") || el.className.slice(0, 30)}`);
    }
  }

  // --- Labels ---
  for (const el of document.querySelectorAll(
    "input:not([type=hidden]), select, textarea",
  )) {
    const labelled =
      (el.labels && el.labels.length) ||
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby");
    if (!labelled) add("unlabelled", el.name || el.id || el.tagName);
  }

  // --- Duplicate ids ---
  const ids = {};
  for (const el of document.querySelectorAll("[id]")) ids[el.id] = (ids[el.id] || 0) + 1;
  for (const id in ids) if (ids[id] > 1) add("dup-id", `${id} x${ids[id]}`);

  // --- Landmarks ---
  const mains = document.querySelectorAll("main").length;
  if (mains !== 1) add("main-count", mains);
  const navs = [...document.querySelectorAll("nav")];
  if (navs.length > 1) {
    for (const nav of navs) {
      if (!nav.getAttribute("aria-label") && !nav.getAttribute("aria-labelledby")) {
        add("nav-unlabelled", nav.className.slice(0, 30) || "(nav)");
      }
    }
  }

  // --- Tap targets ---
  for (const el of document.querySelectorAll(
    "main a[href], main button, main input, main select",
  )) {
    // For a checkbox or radio the real target is the label wrapping it, not
    // the 20px box. Measuring the box alone reports false problems.
    const wrapper = (el.type === "checkbox" || el.type === "radio") && el.closest("label");
    const rect = (wrapper || el).getBoundingClientRect();
    if (!rect.width && !rect.height) continue;
    if (rect.height < 40 || rect.width < 40) {
      // A link inside a sentence is not a tap target to size up; breaking the
      // line height of body copy to hit 44px would be worse than the problem.
      const inProse =
        el.tagName === "A" &&
        ["P", "LI", "DD", "SPAN", "STRONG", "TD"].includes(el.parentElement?.tagName);
      if (!inProse) {
        add(
          "small-target",
          `${el.tagName} "${name(el).slice(0, 26)}" ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        );
      }
    }
  }

  // --- Layout and document ---
  if (document.body.scrollWidth > document.documentElement.clientWidth + 1) {
    add("h-overflow", `${document.body.scrollWidth}>${document.documentElement.clientWidth}`);
  }
  if (document.documentElement.lang !== "en") {
    add("lang", document.documentElement.lang || "(missing)");
  }
  if (!document.title) add("no-title", "");

  return { url: location.pathname, n: P.length, P };
};
