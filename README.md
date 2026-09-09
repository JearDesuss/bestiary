# Bestiary 3D

A Vite + Three.js menagerie with six animal-headed characters, reproducible name-based variation, and a rotatable sculpture viewer.

## Current scope

The app now renders **real mesh geometry** with PBR materials, shadows, human proportions, animal heads, articulated armour, draped cloaks, wings and botanical ornament. Source paintings are no longer displayed as characters or loaded as character textures.

The current meshes are authored procedurally. The specifically requested **GPT Image 2.5 Sunburst concept generation remains pending API access**. See [the asset workflow](art-direction/GENERATION.md) and [the prepared ram prompt](art-direction/ram-character.txt). Do not describe the current meshes as GPT-generated or as reconstructions of generated images.

## Run

```sh
npm ci
npm run dev
# http://127.0.0.1:8790
npm test
npx playwright install chromium
npm run test:browser
npm run build
npm run preview
```

Node 22+ recommended. Vercel builds with Vite and serves `dist/`. Three.js is cached as a separate engine chunk. GLB import and export are loaded only when needed. No API credentials or paid generation services are used by the browser.

## Controls and features

- A name produces the same anatomy, palette and accessories.
- Drag to rotate through all sides; scroll or pinch to zoom.
- Focus the model and use arrow keys to rotate, +/- to zoom, Home to reset.
- Save the current view as a 1600 × 2400 PNG.
- Download the actual character geometry as a GLB 2.0 model.
- Save and reopen creatures in a local cabinet; copy stable links.
- Photo input hashes the file locally; it neither uploads nor reconstructs a likeness.

The 3D cabinet uses a separate storage key from the former collage cabinet, because the artwork system changed. Version 3 links encode the name or seed; older bare links use the current renderer.

## Architecture

- `assets/js/character.js`: deterministic anatomy and PBR mesh authoring, six animal heads, cloth folds, horn tubes, feather geometry, ornaments and material palettes.
- `assets/js/viewer.js`: WebGL renderer, environment and lights, OrbitControls, still captures, GLB export and generated-GLB loading hook.
- `assets/js/app.js`: discovery, navigation, local cabinet, share and download actions.
- `vite.config.js`: local server, production bundling and engine chunk.

The viewer renders on demand, with no permanent animation loop. Gallery thumbnails are rendered from the same actual geometry using one shared renderer; the selected character uses an interactive WebGL canvas. Model resources are disposed when replaced.

## Verification

Unit tests verify all six characters have finite 3D geometry, depth and distinct anatomy, plus deterministic seeds. Browser checks verify pointer rotation changes the rendered image and camera angle, exported GLB files contain full meshes, name/URL reproduction, PNG dimensions, sharing, cabinet persistence, photo hashing, keyboard control, focus restoration and 320/390/768px layouts. Reports are in ignored `output/playwright/`.

## Art direction

Surreal animal-human combinations and material colours are guided by the project owner's supplied painting references, credited to **jaka lodhang**. These sculptures are independently authored and are not the artist's work. The discovery interaction follows [HEADDDS](https://headdds.alxxvine.com/) by alxxvine.

Historical 2D renderers and their source encodings remain in the repository for reference and are excluded from the Vite production dependency graph.
