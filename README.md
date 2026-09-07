# BESTIARY

Type a name. It becomes a beast.

> Every beast is a number. No models, no textures, no image files — every mark on
> screen is drawn from one integer, in the browser, at the moment you ask for it.

A companion to [LODHANG](../lodhang-archive), the archive of eleven collage-paintings
by jaka lodhang. The archive is the museum; this is the generator. Same vault, same
warm-black ramp, same rule that the site owns no colour: every palette here is lifted
from a specific painting in that archive, which is the main reason a hundred generated
beasts look like one body of work instead of a hundred unrelated doodles.

---

## How it works

A name is normalised (`"Ada Lovelace"`, `"ada  lovelace"` and `"ADA LOVELACE"` are one
beast, not three), hashed with FNV-1a, and reduced to an eight-digit seed. That seed
seeds a `mulberry32` stream, and every decision in the genome and every mark in the
drawing comes out of it. `Math.random` appears in exactly one place — choosing which
beast to *show* you when you press **+** — and never inside the drawing.

So a link is a permanent address for a picture:

```
/?name=ada%20lovelace
/?seed=36619034
```

Both reproduce the same beast, on any machine, with nothing stored anywhere.

The stream is **forked per body part**. That is not tidiness: seeds are permanent
links, so if adding a decision to the head code shifted the palette of an
already-published beast, that would be a correctness bug.

## Anatomy

Fixed anatomy, variable parts — which is what keeps the set coherent. Drawing is
strictly back to front, because the source is a collage and the seams between layers
are meant to show.

```
backdrop (torn colour fields, sky band, tropical foliage)
  wings (spread / folded / none)
    body (armour / drapery / bare / fleece) + legs + arms + whatever it is holding
      head (one of twelve animals) + horns / beak / ears + crown / helm / halo / wreath
        companion (cat / bird / dog)
          foreground (datamosh bars, drips, an edge strip, vignette)
```

Twelve heads, four bodies, five headpieces, five held objects, three wing states,
four companions, eleven palettes, two stances. The **uncommonness** score on each
plate is the product of the actual weights in the genome mapped through `-log10` —
a real number, not flattery.

## The look

`assets/js/paint.js` carries the whole visual argument. Four rules, none optional:

- **No edge is ever straight or clean.** Every boundary is subdivided and jittered
  along its normal, the way torn paper is.
- **No area is ever one flat colour.** Fills are scumbled with broken strokes of
  neighbouring palette colours. A flat fill is the single biggest tell of generated art.
- **Seams stay visible.** Layers are not blended into each other.
- **Hard intrusions cut straight across.** Glitch bars and flat rectangles do not
  respect the figure, because in the source work they never do.

---

## Run it

```sh
python tools/serve.py            # http://127.0.0.1:8789
```

Static — plain HTML, CSS and ES modules. No build step, no bundler, no dependencies.

## Look at it

```sh
node tools/shot.mjs --url http://127.0.0.1:8789/ --out shots/summon.png
node tools/shot.mjs --url "http://127.0.0.1:8789/?name=akbar" --out shots/result.png
```

`dev-sheet.html` renders a contact sheet of two dozen beasts at once — the fastest way
to judge whether a change to the generator helped or hurt. Judge changes on the sheet,
never on one beast.

## Files

| File | What it is |
|---|---|
| `assets/js/rng.js` | Hashing, the seeded PRNG, forked streams, value noise. |
| `assets/js/paint.js` | Torn edges, scumbled fills, palette-knife slabs, glitch bars, drips, grain. |
| `assets/js/beast.js` | The genome and the whole figure. |
| `assets/js/palette.js` | Eleven palettes, each lifted from one painting, with colours assigned to *roles* rather than listed as swatches. |
| `assets/js/naming.js` | Titles and plate copy. Only ever describes what is actually in the picture. |
| `assets/js/undergrowth.js` | The painted meadow the beasts stand in. |

---

## Credit

Palettes are taken from paintings by **jaka lodhang**. The beasts are generated and
are not the artist's work. Shape and interaction owe an obvious debt to
[HEADDDS](https://headdds.alxxvine.com) by alxxvine, which is the same idea done with
procedural 3D heads — go and look at it.
