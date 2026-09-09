import { makeRng } from "./rng.js";

export const SPECIES = [
  {
    name: "Ram",
    dress: "Crimson drapery",
    world: "The gilded garden",
    colour: "#a94435",
    line: "A patient soul with a wild inheritance. Some crowns are grown, not given.",
  },
  {
    name: "Goose",
    dress: "Silver armour",
    world: "The blue hour",
    colour: "#6cb2b5",
    line: "A knight of very particular convictions. A soft heart beneath borrowed armour.",
  },
  {
    name: "Tiger",
    dress: "Torn drapery",
    world: "The vermilion court",
    colour: "#ce8843",
    line: "Regal, restless, and almost domesticated. The garden remembers otherwise.",
  },
  {
    name: "Stag",
    dress: "Satin and steel",
    world: "The forgotten forest",
    colour: "#81a594",
    line: "A quiet visitor from the edge of the forest. Carrying a little wilderness into every room.",
  },
  {
    name: "Cat",
    dress: "Painted pasture",
    world: "The sulphur garden",
    colour: "#c6b85c",
    line: "An old soul with excellent posture. The entire kingdom is probably a sunbeam.",
  },
  {
    name: "Toucan",
    dress: "Feathered regalia",
    world: "The tropical twilight",
    colour: "#728fb1",
    line: "Part plumage, part rebellion. A creature that refuses to stay inside the frame.",
  },
];
const EPITHETS = [
  "After the Procession",
  "in Another Life",
  "at the Edge of the Garden",
  "Between Two Worlds",
  "Who Kept the Dawn",
  "in Borrowed Splendour",
  "Before the Rain",
  "Who Would Not Leave",
  "Under an Unfamiliar Sky",
  "Out of Season",
  "at the Quiet Coronation",
  "Among the Ruins",
];
const images = [];
const FILES = ["ram", "goose", "tiger", "knight", "toucan", "harpy"];
// Source head patches and recipient landmarks, recorded in original pixels.
// Keeping the paper around a head is intentional: these are visible collages.
const HEAD_PATCHES = [
  [0, 662, 328, 227, 219],
  [1, 410, 106, 127, 215],
  [2, 280, 278, 275, 322],
  [1, 216, 51, 191, 246],
  [2, 56, 865, 157, 167],
  [4, 209, 180, 218, 206],
];
const SLOTS = [
  [662, 328, 227, 219],
  [410, 106, 127, 215],
  [280, 278, 275, 322],
  [375, 286, 134, 172],
  [209, 180, 218, 206],
  [312, 475, 220, 222],
];
const NATIVE_HEAD = [0, 1, 2, -1, 5, -1];
export async function loadArt() {
  await Promise.all(
    FILES.map(async (name, i) => {
      const img = new Image();
      img.src = new URL(`../art/${name}.webp`, import.meta.url).href;
      await img.decode();
      images[i] = img;
    }),
  );
}
export function validSeed(value) {
  return /^(0|[1-9]\d{0,7})$/.test(String(value));
}
export function composition(seed) {
  const rng = makeRng((seed ^ 0x62ba4211) >>> 0);
  const head = rng.int(0, 5);
  const body = rng.chance(0.36) ? head : rng.int(0, 5);
  return {
    seed,
    head,
    body,
    fragment: rng.int(0, 5),
    mirror: rng.chance(0.5),
    cut: rng.range(0.43, 0.49),
    marks: rng.int(2, 5),
    title: `The ${SPECIES[head].name} ${rng.pick(EPITHETS)}`,
  };
}
export function renderCollage(g, width = 800) {
  if (images.length !== 6)
    throw new Error("The paintings have not loaded yet.");
  const cv = document.createElement("canvas");
  cv.width = width;
  cv.height = width * 1.5;
  cv.setAttribute("role", "img");
  cv.setAttribute(
    "aria-label",
    `${g.title}. A surreal collage featuring ${SPECIES[g.head].name.toLowerCase()} imagery and fragments from ${SPECIES[g.body].world.toLowerCase()}.`,
  );
  const ctx = cv.getContext("2d");
  ctx.scale(width / 800, width / 800);
  const W = 800,
    H = 1200;
  const rng = makeRng((g.seed ^ 0x74acd018) >>> 0);
  function crop(i) {
    const img = images[i];
    // Exclude captured social controls. These are source coordinates, not a
    // destructive edit of the supplied artwork. Preserve the painting's aspect.
    const top = i === 0 ? 24 : 0;
    const height = img.height * (i === 5 ? 0.83 : 0.88) - top;
    const width = Math.min(img.width, (height * W) / H);
    const centre = [0.65, 0.5, 0.53, 0.51, 0.49, 0.53][i];
    const x = Math.max(
      0,
      Math.min(img.width - width, img.width * centre - width / 2),
    );
    return { img, x, top, width, height };
  }
  function panel(i) {
    const c = crop(i);
    ctx.drawImage(c.img, c.x, c.top, c.width, c.height, 0, 0, W, H);
  }
  ctx.save();
  if (g.mirror) {
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
  }
  panel(g.body);
  if (g.body !== g.head) {
    // Recompose the environment in broad torn fragments while preserving the
    // central figure. Separate source paintings remain legible at the seams.
    for (const side of [0, 1]) {
      ctx.save();
      ctx.beginPath();
      const edge = side ? 800 : 0,
        inner = side ? rng.range(635, 705) : rng.range(90, 165);
      const top = g.cut * H - rng.range(150, 360);
      ctx.moveTo(edge, top);
      ctx.lineTo(inner, top + rng.range(-30, 30));
      for (let y = top; y <= 1200; y += 30)
        ctx.lineTo(inner + rng.range(-20, 20), y);
      ctx.lineTo(edge, 1200);
      ctx.closePath();
      ctx.clip();
      panel(g.head);
      ctx.restore();
    }
  }
  if (NATIVE_HEAD[g.body] !== g.head) {
    const [source, sx, sy, sw, sh] = HEAD_PATCHES[g.head];
    const [slotX, slotY, slotW, slotH] = SLOTS[g.body];
    const c = crop(g.body),
      scale = W / c.width;
    const h = Math.max(slotH * scale * 1.22, (slotW * scale * 1.22 * sh) / sw);
    const w = (h * sw) / sh;
    const x = (slotX + slotW / 2 - c.x) * scale - w / 2;
    const y =
      ((slotY + slotH - c.top) * H) / c.height - h + slotH * scale * 0.04;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let dx = 0; dx <= w; dx += 10)
      ctx.lineTo(x + dx, y + rng.range(-4, 4));
    ctx.lineTo(x + w, y + h);
    for (let dx = w; dx >= 0; dx -= 10)
      ctx.lineTo(x + dx, y + h + rng.range(-4, 4));
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(images[source], sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
  }
  // Small displaced fragments stay out of the face and retain the source texture.
  for (let i = 0; i < g.marks; i++) {
    const x = rng.chance(0.5) ? rng.range(0, 100) : rng.range(688, 760);
    const y = rng.range(40, 1110),
      w = rng.range(20, 70),
      h = rng.range(30, 200);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.translate(rng.range(-18, 18), rng.range(-40, 40));
    panel(g.fragment);
    ctx.restore();
  }
  // Fine paint intrusions, stable for every seed; never across the eyes.
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = SPECIES[g.fragment].colour;
  for (let i = 0; i < 3; i++)
    ctx.fillRect(
      rng.range(20, 760),
      rng.range(680, 1150),
      rng.range(2, 6),
      rng.range(25, 160),
    );
  ctx.restore();
  return cv;
}
