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
mark by how far each pixel sits from the background colour, then checks the
result for a halo — the fraction of soft-edge pixels that came back still the
colour of the ground. Under 30% ships; over it, the cream tile is used instead.

| Logo original | Halo | Cutout shipped? |
| --- | --- | --- |
| PNG (the supplied file) | 25.3% | yes |
| The same artwork as JPEG | 50.8% | no |

JPEG puts ringing around every hard edge, and around dark ink on flat cream
that ringing is pixels part-way back toward the background — which is exactly
what a halo is made of.

The four product photographs do not care at all. Only the logo does.

## One thing the cutout cannot fix

The mark is dark ink: its solid strokes sit at 0.21 luminance. With the cream
ground removed there is nothing left to hold it apart from a dark surface, so
on the cocoa-deep sections it all but disappears. The script says so when it
runs. An inverted version would have to be drawn from the original artwork —
no amount of processing invents it.
