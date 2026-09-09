# Source artwork and provenance

The project owner supplied twelve screenshot references. This version uses six of those images as the source material for browser-generated collages. The source artwork is credited in the supplied material to **jaka lodhang**. These remixes are independent experiments and must not be represented as new paintings by that artist.

| Delivered source asset | Supplied screenshot |
| --- | --- |
| assets/art/ram.webp | Screenshot 2026-09-07 235253.png |
| assets/art/goose.webp | Screenshot 2026-09-07 235313.png |
| assets/art/tiger.webp | Screenshot 2026-09-07 235325.png |
| assets/art/knight.webp | Screenshot 2026-09-07 235155.png |
| assets/art/toucan.webp | Screenshot 2026-09-07 235413.png |
| assets/art/harpy.webp | Screenshot 2026-09-07 235351.png |

The files are WebP encodings of the supplied screenshots. `tools/prepare-art.mjs` reproduces encoding from a provided screenshot directory without changing dimensions or composition. Canvas source windows exclude the social-media controls when the website renders an artwork.

Animal fragments: ram from ram.webp; goose and stag from goose.webp; tiger and cat from tiger.webp; toucan from toucan.webp. The source settings come from all six files. Some detail is limited by the size of fragments in the supplied screenshots, especially the small cat head.

Image generation was attempted using the built-in tool. The first request failed with a network error and the retry returned a usage limit. No generated AI image from those calls is included in this repository. Future replacement art should keep the six anatomical landmark mappings in sync with the renderer.
