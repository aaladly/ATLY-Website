# Original photography

The full-resolution originals live here. They are **never served** — they are
around 2.5 MB each, and `npm run build:images` turns them into the optimised
derivatives in `public/images/` that the site actually loads.

Put a file here, run the script, and the site switches from the "Photograph
pending" placeholder to the real photograph on its own.

## The file names matter

They are matched exactly, and they are declared in `src/lib/images.ts`. Rename
the uploads to these:

The **base name** is matched. The extension is not — `.png`, `.jpg`, `.jpeg`,
`.webp`, `.tif` and `.avif` are all accepted, because a browser save turns a
PNG into a JPEG without asking and everything here is re-encoded anyway.

| Base name               | What it is                                        |
| ----------------------- | ------------------------------------------------- |
| `collection-assortment` | The full lineup — roses, domes, several box sizes |
| `bar-milk-chocolate`    | One wrapped bar, 15 segments, gold shimmer        |
| `bonbons-6-piece`       | Six domes in a square clear box                   |
| `bonbons-rose-3-piece`  | Three roses in a rectangular clear box            |
| `logo-atly`             | The circular logo                                 |

Product shots are 4:5 portrait. Anything else is centre-cropped rather than
squashed, and the script says so when it does it.

## The logo is the one that wants a PNG

Not a rule, but measured. The script cuts the cream ground out from behind the
mark by how far each pixel sits from the background colour. JPEG puts ringing
around every hard edge, and around dark ink on a flat ground that ringing is
pixels part-way back toward cream — which the key reads as "partly
transparent".

The same artwork, both ways:

| Original | Translucent ink | Cutout shipped? |
| --- | --- | --- |
| PNG  | 2.2%  | yes |
| JPEG | 37.8% | no — falls back to the cream tile |

The product photographs do not care. Only the logo does.

## Then

```
npm run build:images
```

It prints the weight of every derivative, fails if one goes over the 150 KB
budget at 800px, and rewrites `src/lib/images.generated.ts` with what it made.

## One thing it does silently, on purpose

It strips EXIF. Phone photographs of a product on a kitchen counter carry the
GPS coordinates of the kitchen, and this is a family home.
