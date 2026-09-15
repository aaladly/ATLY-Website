# Original photography

The full-resolution originals live here. They are **never served** — they are
around 2.5 MB each, and `npm run build:images` turns them into the optimised
derivatives in `public/images/` that the site actually loads.

Put a file here, run the script, and the site switches from the "Photograph
pending" placeholder to the real photograph on its own.

## The file names matter

They are matched exactly, and they are declared in `src/lib/images.ts`. Rename
the uploads to these:

| File name                    | What it is                                        |
| ---------------------------- | ------------------------------------------------- |
| `collection-assortment.png`  | The full lineup — roses, domes, several box sizes |
| `bar-milk-chocolate.png`     | One wrapped bar, 15 segments, gold shimmer        |
| `bonbons-6-piece.png`        | Six domes in a square clear box                   |
| `bonbons-rose-3-piece.png`   | Three roses in a rectangular clear box            |
| `logo-atly.png`              | The circular logo                                 |

Product shots are 4:5 portrait. Anything else is centre-cropped rather than
squashed, and the script says so when it does it.

## Then

```
npm run build:images
```

It prints the weight of every derivative, fails if one goes over the 150 KB
budget at 800px, and rewrites `src/lib/images.generated.ts` with what it made.

## One thing it does silently, on purpose

It strips EXIF. Phone photographs of a product on a kitchen counter carry the
GPS coordinates of the kitchen, and this is a family home.
