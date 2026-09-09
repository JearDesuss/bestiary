# Bestiary

Find your other nature. A name becomes a repeatable, surreal collage creature.

Production: https://bestiary-livid.vercel.app

## What it does

- Name lookup with case, whitespace and Unicode normalization.
- Six animal natures, six source settings, head swaps, torn fragments and seeded paint marks.
- Random discovery and a touch-scrollable portrait rail.
- Local photo hashing: the same file produces the same creature. Photos are never uploaded and are not interpreted as a likeness.
- Stable share links, browser back/forward navigation and 1600 × 2400 PNG downloads.
- A local cabinet of up to 60 saved creatures, with remove and reopen actions.
- Keyboard access, native modal focus management, reduced motion and mobile layouts.

The artwork uses fragments from the supplied screenshot references. It is not freshly generated AI artwork: image generation was unavailable during this iteration. See [ART_SOURCES.md](ART_SOURCES.md) for attribution and source mappings. The remixes are independent compositions, not new works by the reference artist.

## Run and check

Requires Node 22+ and Python 3 for the local server.

```sh
npm ci
npm run dev
# http://127.0.0.1:8789
```

In another terminal:

```sh
npm test
npx playwright install chromium
npm run test:browser
npm run build
```

Browser checks cover name determinism, PNG export dimensions, sharing, saved cabinet persistence, photo hashing, invalid seeds, markup safety, history, focus, keyboard access and 320/390/768px layouts. Captures and reports go into ignored `output/playwright/`.

## Art and rendering

`assets/js/collage.js` selects a source setting and an animal head, places the head at a recorded anatomical landmark, and adds seeded torn fragments. Canvas source crops exclude captured social UI. Source files are only WebP-encoded for delivery; the live canvas performs composition. There is no runtime image-generation API, backend or paid service.

`assets/js/rng.js` maps names to eight-digit seeds. The renderer uses only seeded randomness. The artwork system is version 2; older bare name/seed links resolve to the current visual renderer. The historical procedural renderer remains in `beast.js` and its supporting modules for reference.

`DESIGN.md` records the design vocabulary. The production build copies only HTML and assets into `dist/`, and fails if any required source image is absent. Vercel runs `npm run build` and serves `dist/`.

## Credit

Art references supplied by the project owner, credited in the supplied material to **jaka lodhang**. Name-to-creature interaction inspired by [HEADDDS](https://headdds.alxxvine.com/) by **alxxvine**.
