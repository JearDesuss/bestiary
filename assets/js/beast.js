/**
 * The generator.
 *
 * One integer in, one beast out. Nothing here loads a file: every mark is drawn,
 * and the same seed must always produce exactly the same picture, so all
 * randomness comes from the seeded stream passed in.
 *
 * The anatomy is fixed and the variation lives in its parts, which is what keeps
 * a hundred beasts feeling like one body of work rather than a hundred unrelated
 * doodles. Drawing order is strictly back to front, because the source these are
 * modelled on is a collage: the seams between layers are meant to show.
 */

import { makeRng, makeNoise, seedFromName } from './rng.js'
import { PALETTES, pickPalette } from './palette.js'
import {
  shape, tornPath, setLastPolygon, rectPts, ellipsePts, glitchBars,
  drips, slab, rgba, shade, grain,
} from './paint.js'

export const W = 1000
export const H = 1400
const GROUND = 1268

// ------------------------------------------------------------- vocabulary ---
export const HEADS = {
  ram:      { cranium: [0.50, 0.44], muzzle: [0.46, 0.34], horn: 'spiral',   ear: 'droop' },
  bull:     { cranium: [0.60, 0.50], muzzle: [0.44, 0.44], horn: 'crescent', ear: 'side' },
  antelope: { cranium: [0.40, 0.42], muzzle: [0.56, 0.26], horn: 'straight', ear: 'point' },
  stag:     { cranium: [0.44, 0.44], muzzle: [0.54, 0.28], horn: 'antler',   ear: 'point' },
  tiger:    { cranium: [0.66, 0.56], muzzle: [0.30, 0.44], horn: 'none',     ear: 'round' },
  cat:      { cranium: [0.60, 0.52], muzzle: [0.24, 0.34], horn: 'none',     ear: 'triangle' },
  boar:     { cranium: [0.56, 0.46], muzzle: [0.50, 0.36], horn: 'tusk',     ear: 'point' },
  horse:    { cranium: [0.42, 0.44], muzzle: [0.64, 0.30], horn: 'none',     ear: 'point' },
  hare:     { cranium: [0.46, 0.44], muzzle: [0.30, 0.28], horn: 'none',     ear: 'long' },
  goose:    { cranium: [0.34, 0.32], muzzle: [0.00, 0.00], horn: 'none',     ear: 'none', beak: 'long' },
  toucan:   { cranium: [0.32, 0.32], muzzle: [0.00, 0.00], horn: 'none',     ear: 'none', beak: 'huge' },
  crane:    { cranium: [0.28, 0.26], muzzle: [0.00, 0.00], horn: 'none',     ear: 'none', beak: 'spear' },
}

export const BODIES = ['armour', 'drapery', 'bare', 'fleece']
export const CROWNS = ['none', 'crown', 'helm', 'halo', 'wreath']
export const HELD = ['none', 'staff', 'sword', 'fleece', 'bird']
export const WINGS = ['none', 'none', 'spread', 'folded']
export const COMPANIONS = ['none', 'none', 'cat', 'bird', 'dog']

// ------------------------------------------------------------ the genome ----
/** Everything about a beast, decided before a single mark is made. */
export function genome(seed) {
  const rng = makeRng(seed || 1)
  const head = rng.pick(Object.keys(HEADS))
  const palette = pickPalette(rng)

  return {
    seed,
    head,
    body: rng.weighted([['armour', 3], ['drapery', 3], ['bare', 2], ['fleece', 2]]),
    crown: rng.weighted([['none', 3], ['crown', 2], ['helm', 2], ['halo', 1], ['wreath', 2]]),
    held: rng.weighted([['none', 4], ['staff', 2], ['sword', 2], ['fleece', 1], ['bird', 2]]),
    wings: rng.weighted([['none', 5], ['spread', 2], ['folded', 2]]),
    companion: rng.weighted([['none', 4], ['cat', 2], ['bird', 2], ['dog', 1]]),
    palette,
    glitch: rng.chance(0.62),
    drip: rng.chance(0.5),
    foliage: rng.chance(0.72),
    skyBand: rng.chance(0.55),
    facing: rng.chance(0.5) ? 1 : -1,
    stance: rng.weighted([['contrapposto', 5], ['stand', 2]]),
    armLift: rng.weighted([[1, 3], [0, 4]]),
    build: rng.range(0.86, 1.14),
    headSize: rng.range(0.94, 1.2),
    headTilt: rng.range(-0.16, 0.16),
    rough: rng.range(4, 12),
  }
}

// ------------------------------------------------------------------ parts ---
function drawBackdrop(ctx, g, rng, noise) {
  const p = g.palette
  ctx.fillStyle = p.ground
  ctx.fillRect(0, 0, W, H)

  // Broad torn fields — the painted ground the figure is cut into.
  for (let i = 0; i < 7; i++) {
    const x = rng.range(-140, W * 0.75)
    const y = rng.range(-140, H * 0.72)
    const w = rng.range(W * 0.3, W * 0.95)
    const h = rng.range(H * 0.18, H * 0.62)
    ctx.globalAlpha = rng.range(0.5, 0.95)
    shape(ctx, rectPts(x, y, w, h), rng.pick(p.field), p.all, rng, noise,
      { rough: rng.range(10, 26), seed: i * 13, strokes: 22, width: 44, alpha: 0.24 })
  }
  ctx.globalAlpha = 1

  if (g.skyBand) {
    ctx.globalAlpha = 0.9
    shape(ctx, rectPts(-40, rng.range(-40, H * 0.16), W + 80, rng.range(H * 0.16, H * 0.34)),
      p.sky, p.all, rng, noise, { rough: 16, seed: 91, strokes: 18, width: 60, alpha: 0.2 })
    ctx.globalAlpha = 1
  }

  if (g.foliage) drawFoliage(ctx, g, rng, noise)
}

/** Tropical planting: fat leaf blades in stacked greens, cut off by the frame. */
function drawFoliage(ctx, g, rng, noise) {
  const p = g.palette
  const n = rng.int(9, 18)
  for (let i = 0; i < n; i++) {
    const bx = rng.range(-60, W + 60)
    const by = rng.range(H * 0.42, H + 80)
    const len = rng.range(120, 420)
    const ang = rng.range(-Math.PI * 0.95, -Math.PI * 0.05)
    const tipX = bx + Math.cos(ang) * len
    const tipY = by + Math.sin(ang) * len
    const wid = rng.range(26, 92)
    const col = rng.pick(p.leaf)
    ctx.globalAlpha = rng.range(0.55, 1)
    slab(ctx, bx, by, tipX, tipY, wid, col, rng)
    // A midrib, which is what makes a blob read as a leaf.
    ctx.globalAlpha = rng.range(0.25, 0.55)
    ctx.strokeStyle = shade(col, -0.35)
    ctx.lineWidth = rng.range(1, 3)
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(tipX, tipY)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function drawWings(ctx, g, rng, noise) {
  if (g.wings === 'none') return
  const p = g.palette
  const cx = W / 2
  const cy = 700
  const spread = g.wings === 'spread'
  for (const side of [-1, 1]) {
    const reach = spread ? rng.range(330, 460) : rng.range(150, 220)
    const drop = spread ? rng.range(-120, 60) : rng.range(120, 260)
    const feathers = spread ? rng.int(9, 14) : rng.int(6, 9)
    for (let i = 0; i < feathers; i++) {
      const t = i / (feathers - 1 || 1)
      const ang = (spread ? -0.85 : -0.2) + t * (spread ? 1.5 : 1.1)
      const len = reach * (0.55 + 0.45 * Math.sin(t * Math.PI))
      const x1 = cx + side * (60 + Math.cos(ang) * len)
      const y1 = cy + drop + Math.sin(ang) * len
      ctx.globalAlpha = rng.range(0.7, 1)
      slab(ctx, cx + side * 50, cy + drop * 0.4, x1, y1, rng.range(18, 40),
        rng.pick(p.wing), rng)
    }
  }
  ctx.globalAlpha = 1
}

function drawBody(ctx, g, rng, noise) {
  const p = g.palette
  const b = g.build
  const shoulderY = 690
  const waistY = 880
  const hipY = 980
  const halfShoulder = 158 * b
  const halfWaist = 104 * b
  const halfHip = 130 * b

  // Contrapposto: the hips shift under the weight-bearing leg and the shoulders
  // counter it. Without this every beast stands to attention like a scarecrow.
  const lean = g.stance === 'contrapposto' ? rng.range(14, 34) * g.facing : 0
  const cx = W / 2
  const hipCx = cx + lean
  const shoulderCx = cx - lean * 0.55

  // Legs first, so the torso overlaps them at the hip.
  for (const side of [-1, 1]) {
    const weight = g.stance === 'contrapposto' && side === Math.sign(lean || 1)
    const hx = hipCx + side * halfHip * 0.52
    // The weight leg goes nearly straight down; the free leg bends and trails.
    const kneeX = hx + side * (weight ? rng.range(-6, 8) : rng.range(10, 40))
    const kneeY = weight ? 1128 : rng.range(1100, 1140)
    const footX = kneeX + side * (weight ? rng.range(-6, 10) : rng.range(14, 52))
    slab(ctx, hx, hipY - 14, kneeX, kneeY, rng.range(56, 78) * b, p.flesh[0], rng)
    slab(ctx, kneeX, kneeY - 8, footX, GROUND, rng.range(40, 58) * b, p.flesh[1] ?? p.flesh[0], rng)
    ctx.globalAlpha = 0.95
    shape(ctx, ellipsePts(footX + side * 12, GROUND - 6, 46 * b, 17, 18), p.flesh[0], p.all,
      rng, noise, { rough: 3, seed: side * 31, strokes: 8, width: 14, alpha: 0.2 })
    ctx.globalAlpha = 1
  }

  // A real silhouette: shoulders wider than the waist, hips wider than the
  // waist again. A four-point trapezoid reads as a paper doll no matter how
  // well it is painted.
  const torso = [
    [shoulderCx - halfShoulder * 0.72, shoulderY - 34],
    [shoulderCx - halfShoulder, shoulderY + 14],
    [shoulderCx - halfShoulder * 0.94, shoulderY + 96],
    [cx - halfWaist, waistY],
    [hipCx - halfHip, hipY],
    [hipCx + halfHip, hipY],
    [cx + halfWaist, waistY],
    [shoulderCx + halfShoulder * 0.94, shoulderY + 96],
    [shoulderCx + halfShoulder, shoulderY + 14],
    [shoulderCx + halfShoulder * 0.72, shoulderY - 34],
  ]

  if (g.body === 'armour') {
    shape(ctx, torso, p.metal[0], p.metal, rng, noise,
      { rough: 3, seed: 7, strokes: 30, width: 22, alpha: 0.34, edge: shade(p.metal[0], -0.5), edgeAlpha: 0.7 })
    // Plate divisions — the thing that says armour rather than a grey shirt.
    ctx.save()
    ctx.strokeStyle = rgba(shade(p.metal[0], -0.55), 0.75)
    ctx.lineWidth = 2.4
    for (let i = 1; i < 4; i++) {
      const y = shoulderY + ((hipY - shoulderY) * i) / 4
      const half = halfShoulder + ((halfHip - halfShoulder) * i) / 4
      ctx.beginPath()
      ctx.moveTo(cx - half, y)
      ctx.quadraticCurveTo(cx, y + 16, cx + half, y)
      ctx.stroke()
    }
    ctx.restore()
  } else if (g.body === 'fleece') {
    shape(ctx, torso, p.wool[0], p.wool, rng, noise,
      { rough: 16, seed: 7, strokes: 40, width: 26, alpha: 0.3 })
    for (let i = 0; i < 60; i++) {
      const x = cx + rng.range(-halfShoulder, halfShoulder)
      const y = rng.range(shoulderY, hipY)
      ctx.globalAlpha = rng.range(0.2, 0.5)
      ctx.strokeStyle = rng.pick(p.wool)
      ctx.lineWidth = rng.range(2, 6)
      ctx.beginPath()
      ctx.arc(x, y, rng.range(6, 18), rng.range(0, 6), rng.range(2, 6))
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  } else {
    shape(ctx, torso, p.flesh[0], p.flesh, rng, noise,
      { rough: 5, seed: 7, strokes: 26, width: 30, alpha: 0.26 })
  }

  // Drapery over the top, always torn and always a different colour family.
  if (g.body === 'drapery' || rng.chance(0.55)) {
    const dx = cx + rng.range(-70, 70)
    ctx.globalAlpha = rng.range(0.8, 1)
    shape(ctx, [
      [dx - rng.range(60, 190), shoulderY - rng.range(10, 70)],
      [dx + rng.range(60, 190), shoulderY - rng.range(0, 40)],
      [dx + rng.range(80, 240), hipY + rng.range(20, 190)],
      [dx - rng.range(80, 240), hipY + rng.range(0, 160)],
    ], rng.pick(p.cloth), p.cloth, rng, noise,
      { rough: 14, seed: 23, strokes: 30, width: 34, alpha: 0.3 })
    ctx.globalAlpha = 1
  }

  drawArms(ctx, g, rng, noise, shoulderCx, shoulderY, b)
}

function drawArms(ctx, g, rng, noise, cx, shoulderY, b) {
  const p = g.palette
  const halfShoulder = 158 * b
  for (const side of [-1, 1]) {
    const sx = cx + side * halfShoulder * 0.9
    // One arm is allowed to break away from the body. Two arms hanging in
    // parallel is the single strongest scarecrow signal there is.
    const raised = side === g.facing && g.armLift > 0
    const elbowX = sx + side * rng.range(24, 78)
    const elbowY = shoulderY + (raised ? rng.range(40, 110) : rng.range(130, 200))
    const handX = elbowX + side * (raised ? rng.range(-90, 20) : rng.range(-40, 60))
    const handY = elbowY + (raised ? -rng.range(40, 170) : rng.range(90, 180))
    slab(ctx, sx, shoulderY + 16, elbowX, elbowY, rng.range(34, 48) * b, p.flesh[0], rng)
    slab(ctx, elbowX, elbowY, handX, handY, rng.range(26, 38) * b, p.flesh[1] ?? p.flesh[0], rng)
    ctx.globalAlpha = 0.95
    shape(ctx, ellipsePts(handX, handY, 24 * b, 30 * b, 16), p.flesh[0], p.all, rng, noise,
      { rough: 3, seed: side * 17, strokes: 6, width: 10, alpha: 0.2 })
    ctx.globalAlpha = 1
    if (side === g.facing) drawHeld(ctx, g, rng, noise, handX, handY)
  }
}

function drawHeld(ctx, g, rng, noise, x, y) {
  const p = g.palette
  if (g.held === 'staff') {
    slab(ctx, x + rng.range(-8, 8), y - rng.range(360, 520), x, y + rng.range(80, 190),
      rng.range(9, 16), p.wood, rng)
  } else if (g.held === 'sword') {
    slab(ctx, x, y - 20, x + rng.range(-30, 30), y + rng.range(220, 340), rng.range(16, 26), p.metal[0], rng)
    ctx.fillStyle = shade(p.metal[0], -0.4)
    ctx.fillRect(x - 46, y - 30, 92, 12)
  } else if (g.held === 'fleece') {
    ctx.globalAlpha = 0.95
    shape(ctx, ellipsePts(x + rng.range(-30, 30), y + rng.range(40, 110), rng.range(70, 120),
      rng.range(90, 150), 22), p.wool[0], p.wool, rng, noise,
      { rough: 18, seed: 55, strokes: 26, width: 20, alpha: 0.3 })
    ctx.globalAlpha = 1
  } else if (g.held === 'bird') {
    drawSmallBird(ctx, g, rng, noise, x + rng.range(-20, 20), y - rng.range(30, 80), rng.range(0.5, 0.8))
  }
}

function drawSmallBird(ctx, g, rng, noise, x, y, s = 1) {
  const p = g.palette
  ctx.globalAlpha = 0.98
  shape(ctx, ellipsePts(x, y, 46 * s, 30 * s, 18, rng.range(-0.4, 0.4)),
    rng.pick(p.wing), p.all, rng, noise, { rough: 4, seed: 71, strokes: 10, width: 12, alpha: 0.25 })
  shape(ctx, ellipsePts(x - 34 * s, y - 22 * s, 20 * s, 18 * s, 14),
    rng.pick(p.wing), p.all, rng, noise, { rough: 3, seed: 72, strokes: 5, width: 8, alpha: 0.2 })
  ctx.fillStyle = p.beak
  ctx.beginPath()
  ctx.moveTo(x - 50 * s, y - 24 * s)
  ctx.lineTo(x - 84 * s, y - 16 * s)
  ctx.lineTo(x - 50 * s, y - 8 * s)
  ctx.closePath()
  ctx.fill()
  for (let i = 0; i < 4; i++) {
    slab(ctx, x, y, x + rng.range(30, 90) * s, y + rng.range(-40, 30) * s, 12 * s, rng.pick(p.wing), rng)
  }
  ctx.globalAlpha = 1
}

// ------------------------------------------------------------------ head ----
function drawHead(ctx, g, rng, noise) {
  const p = g.palette
  const spec = HEADS[g.head]
  // The head is the identity of the beast, so it is deliberately oversized
  // against the body — closer to a woodcut than to human proportion.
  const s = 288 * g.headSize
  const cx = W / 2 + rng.range(-12, 12)
  const cy = 452
  const f = g.facing

  // Neck, drawn before the tilt so it stays planted on the shoulders.
  slab(ctx, cx, cy + s * 0.3, W / 2, 706, 78 * g.build, p.flesh[0], rng)

  // Tilt the head about the base of the neck. A dead-level head reads as a mask
  // on a pole; a few degrees is all it takes to read as an animal looking.
  ctx.save()
  ctx.translate(cx, cy + s * 0.3)
  ctx.rotate(g.headTilt)
  ctx.translate(-cx, -(cy + s * 0.3))

  if (spec.horn === 'antler') drawAntlers(ctx, p, rng, noise, cx, cy, s)
  if (spec.ear !== 'none') drawEars(ctx, spec.ear, p, rng, noise, cx, cy, s)

  // Cranium
  const cw = spec.cranium[0] * s
  const ch = spec.cranium[1] * s
  shape(ctx, ellipsePts(cx, cy, cw, ch, 26), p.fur[0], p.fur, rng, noise,
    { rough: 5, seed: 101, strokes: 24, width: 26, alpha: 0.3 })

  // Muzzle or beak
  if (spec.beak) {
    drawBeak(ctx, spec.beak, p, rng, noise, cx + f * cw * 0.7, cy + ch * 0.1, s, f)
  } else if (spec.muzzle[0] > 0) {
    const ml = spec.muzzle[0] * s
    const mw = spec.muzzle[1] * s
    shape(ctx, [
      [cx, cy - mw * 0.5],
      [cx + f * ml, cy - mw * 0.30 + s * 0.06],
      [cx + f * ml, cy + mw * 0.42 + s * 0.06],
      [cx, cy + mw * 0.6],
    ], p.fur[1] ?? p.fur[0], p.fur, rng, noise,
      { rough: 4, seed: 103, strokes: 14, width: 16, alpha: 0.26 })
    // Nostril and mouth line — small marks, large effect.
    ctx.fillStyle = rgba('#100c0a', 0.75)
    ctx.beginPath()
    ctx.ellipse(cx + f * ml * 0.86, cy + s * 0.02, s * 0.028, s * 0.02, 0, 0, 6.3)
    ctx.fill()
    ctx.strokeStyle = rgba('#100c0a', 0.55)
    ctx.lineWidth = s * 0.014
    ctx.beginPath()
    ctx.moveTo(cx + f * ml * 0.9, cy + mw * 0.34)
    ctx.lineTo(cx + f * ml * 0.35, cy + mw * 0.46)
    ctx.stroke()
  }

  if (spec.horn === 'spiral') drawSpiralHorns(ctx, p, rng, cx, cy, s)
  if (spec.horn === 'crescent') drawCrescentHorns(ctx, p, rng, cx, cy, s)
  if (spec.horn === 'straight') drawStraightHorns(ctx, p, rng, cx, cy, s)
  if (spec.horn === 'tusk') drawTusks(ctx, p, rng, cx, cy, s, f)

  drawMarkings(ctx, g, rng, cx, cy, cw, ch, s, f)

  // The far eye, on the other side of a three-quarter head. Smaller, dimmer and
  // pushed toward the edge of the skull. Without it every animal in the set has
  // one eye and reads as a mask rather than as a head with a far side.
  if (!spec.beak) {
    ctx.globalAlpha = 0.72
    drawEye(ctx, p, rng, cx - f * cw * 0.42, cy - ch * 0.13, s * 0.74)
    ctx.globalAlpha = 1
  }
  drawEye(ctx, p, rng, cx + f * cw * 0.34, cy - ch * 0.16, s)
  if (g.crown !== 'none') drawCrown(ctx, g, rng, noise, cx, cy - ch * 1.02, s)
  ctx.restore()
}

/**
 * Species markings on the skull.
 *
 * Without these every head is a plain oval and the animal is carried entirely by
 * whatever is bolted to the top of it — tiger, cat and hare come out identical.
 * Markings are clipped to the cranium so they wrap the form instead of floating.
 */
function drawMarkings(ctx, g, rng, cx, cy, cw, ch, s, f) {
  const p = g.palette
  const dark = shade(p.fur[0], -0.5)
  const pale = shade(p.fur[1] ?? p.fur[0], 0.42)

  ctx.save()
  ctx.beginPath()
  ctx.ellipse(cx, cy, cw * 1.02, ch * 1.02, 0, 0, Math.PI * 2)
  ctx.clip()

  const stripes = (n, col, alpha, len) => {
    ctx.globalAlpha = alpha
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n
      const x = cx - cw + t * cw * 2
      const lean = (x - cx) * 0.22
      slab(ctx, x - lean, cy - ch * 1.05, x + lean, cy - ch * (1.05 - len),
        s * rng.range(0.022, 0.05), col, rng)
    }
    ctx.globalAlpha = 1
  }

  const patches = (n, col, alpha) => {
    ctx.globalAlpha = alpha
    for (let i = 0; i < n; i++) {
      shape(ctx, ellipsePts(cx + rng.range(-cw, cw), cy + rng.range(-ch, ch),
        rng.range(cw * 0.28, cw * 0.62), rng.range(ch * 0.24, ch * 0.55), 16,
        rng.range(0, 3)), col, [col], rng, (x) => 0.5,
        { rough: 6, seed: 600 + i, strokes: 6, width: 12, alpha: 0.2 })
    }
    ctx.globalAlpha = 1
  }

  switch (g.head) {
    case 'tiger': stripes(7, dark, 0.72, 0.95); break
    case 'cat': stripes(5, dark, 0.5, 0.7); break
    case 'boar':
      stripes(9, dark, 0.4, 0.45)
      break
    case 'bull': patches(2, pale, 0.6); break
    case 'horse':
      // A blaze straight down the face.
      ctx.globalAlpha = 0.72
      slab(ctx, cx + f * cw * 0.18, cy - ch, cx + f * cw * 0.5, cy + ch, s * 0.075, pale, rng)
      ctx.globalAlpha = 1
      break
    case 'hare':
      ctx.globalAlpha = 0.6
      slab(ctx, cx, cy - ch, cx + f * cw * 0.4, cy + ch * 0.8, s * 0.055, pale, rng)
      ctx.globalAlpha = 1
      break
    case 'stag':
    case 'antelope':
      // Pale muzzle band and a dark eye patch — the deer face in two marks.
      ctx.globalAlpha = 0.62
      slab(ctx, cx + f * cw * 0.3, cy + ch * 0.35, cx + f * cw * 1.1, cy + ch * 0.42,
        s * 0.07, pale, rng)
      ctx.globalAlpha = 0.5
      shape(ctx, ellipsePts(cx + f * cw * 0.34, cy - ch * 0.16, cw * 0.3, ch * 0.26, 14),
        dark, [dark], rng, () => 0.5, { rough: 4, seed: 611, strokes: 4, width: 10, alpha: 0.2 })
      ctx.globalAlpha = 1
      break
    case 'ram':
      patches(1, pale, 0.4)
      break
    default:
      // Birds: a cap or cheek patch in a wing colour.
      ctx.globalAlpha = 0.55
      shape(ctx, ellipsePts(cx, cy - ch * 0.5, cw * 0.9, ch * 0.55, 16),
        rng.pick(p.wing), [rng.pick(p.wing)], rng, () => 0.5,
        { rough: 5, seed: 612, strokes: 5, width: 10, alpha: 0.2 })
      ctx.globalAlpha = 1
  }
  ctx.restore()
}

function drawEye(ctx, p, rng, x, y, s) {
  ctx.fillStyle = '#f2ece0'
  ctx.beginPath()
  ctx.ellipse(x, y, s * 0.062, s * 0.046, rng.range(-0.2, 0.2), 0, 6.3)
  ctx.fill()
  ctx.fillStyle = '#0e0b09'
  ctx.beginPath()
  ctx.ellipse(x + s * 0.008, y, s * 0.03, s * 0.032, 0, 0, 6.3)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.beginPath()
  ctx.arc(x - s * 0.012, y - s * 0.012, s * 0.009, 0, 6.3)
  ctx.fill()
}

function drawEars(ctx, kind, p, rng, noise, cx, cy, s) {
  const col = p.fur[1] ?? p.fur[0]
  for (const side of [-1, 1]) {
    const bx = cx + side * s * 0.3
    const by = cy - s * 0.24
    if (kind === 'long') {
      slab(ctx, bx, by, bx + side * rng.range(10, 50), by - rng.range(s * 0.7, s * 1.15),
        s * 0.11, col, rng)
    } else if (kind === 'triangle' || kind === 'point') {
      ctx.beginPath()
      ctx.moveTo(bx - s * 0.11, by)
      ctx.lineTo(bx + side * s * 0.13, by - s * 0.33)
      ctx.lineTo(bx + s * 0.11, by + s * 0.03)
      ctx.closePath()
      ctx.fillStyle = col
      ctx.fill()
    } else if (kind === 'round') {
      shape(ctx, ellipsePts(bx, by - s * 0.06, s * 0.14, s * 0.14, 14), col, p.fur, rng, noise,
        { rough: 3, seed: side * 5, strokes: 6, width: 8, alpha: 0.2 })
    } else if (kind === 'droop') {
      slab(ctx, bx, by + s * 0.04, bx + side * s * 0.34, by + s * 0.2, s * 0.1, col, rng)
    } else if (kind === 'side') {
      slab(ctx, bx, by + s * 0.1, bx + side * s * 0.32, by + s * 0.06, s * 0.1, col, rng)
    }
  }
}

function drawSpiralHorns(ctx, p, rng, cx, cy, s) {
  // A ram's horn is a logarithmic spiral that starts thick at the skull and
  // tapers as it curls. Stepping a constant-width segment round a tight circle
  // — the obvious implementation — just paints a disc.
  // Seen from the front a ram's horns curl at the SIDE of the skull, foreshortened
  // into a flattened ellipse. Drawn as a full circular spiral centred on the face
  // they read as a pair of spectacles, which is exactly what they did before.
  const turns = rng.range(1.05, 1.35)
  const steps = 44
  const r0 = s * 0.075
  const growth = rng.range(1.35, 1.75)
  const squashX = 0.58        // the foreshortening
  const originX = s * 0.40    // out at the ear, not on the brow
  const originY = -s * 0.02

  for (const side of [-1, 1]) {
    const pt = (t) => {
      const a = t * turns * Math.PI * 2 - Math.PI * 0.35
      const r = r0 * Math.exp(growth * t)
      return [
        cx + side * (originX + Math.cos(a) * r * squashX),
        cy + originY + Math.sin(a) * r,
      ]
    }
    let prev = pt(0)
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const cur = pt(t)
      slab(ctx, prev[0], prev[1], cur[0], cur[1], s * (0.125 - 0.095 * t), p.horn, rng)
      prev = cur
    }
    // Growth rings across the horn — what stops it reading as a smooth tube.
    ctx.strokeStyle = rgba(shade(p.horn, -0.42), 0.5)
    ctx.lineWidth = Math.max(1, s * 0.008)
    for (let i = 3; i < steps; i += 4) {
      const t = i / steps
      const [x, y] = pt(t)
      const [nx, ny] = pt(Math.min(1, t + 0.03))
      const dx = nx - x
      const dy = ny - y
      const len = Math.hypot(dx, dy) || 1
      const w = s * (0.125 - 0.095 * t) * 0.5
      ctx.beginPath()
      ctx.moveTo(x + (-dy / len) * w, y + (dx / len) * w)
      ctx.lineTo(x - (-dy / len) * w, y - (dx / len) * w)
      ctx.stroke()
    }
  }
}

function drawCrescentHorns(ctx, p, rng, cx, cy, s) {
  for (const side of [-1, 1]) {
    let x = cx + side * s * 0.3
    let y = cy - s * 0.24
    let a = side > 0 ? -0.2 : Math.PI + 0.2
    for (let i = 0; i < 16; i++) {
      const len = s * 0.075
      const nx = x + Math.cos(a) * len
      const ny = y + Math.sin(a) * len
      slab(ctx, x, y, nx, ny, s * (0.1 - i * 0.004), p.horn, rng)
      x = nx
      y = ny
      a -= side * 0.155
    }
  }
}

function drawStraightHorns(ctx, p, rng, cx, cy, s) {
  for (const side of [-1, 1]) {
    const bx = cx + side * s * 0.22
    const by = cy - s * 0.28
    const tipX = bx + side * rng.range(s * 0.08, s * 0.3)
    const tipY = by - rng.range(s * 0.9, s * 1.5)
    slab(ctx, bx, by, tipX, tipY, s * 0.075, p.horn, rng)
    // Ridges, so it reads as horn rather than as a stick.
    ctx.strokeStyle = rgba(shade(p.horn, -0.4), 0.55)
    ctx.lineWidth = 2
    for (let i = 1; i < 9; i++) {
      const t = i / 9
      ctx.beginPath()
      ctx.moveTo(bx + (tipX - bx) * t - s * 0.03, by + (tipY - by) * t)
      ctx.lineTo(bx + (tipX - bx) * t + s * 0.03, by + (tipY - by) * t - s * 0.01)
      ctx.stroke()
    }
  }
}

function drawAntlers(ctx, p, rng, noise, cx, cy, s) {
  for (const side of [-1, 1]) {
    let x = cx + side * s * 0.2
    let y = cy - s * 0.3
    let a = -Math.PI / 2 + side * 0.35
    for (let i = 0; i < 5; i++) {
      const len = s * rng.range(0.22, 0.36)
      const nx = x + Math.cos(a) * len
      const ny = y + Math.sin(a) * len
      slab(ctx, x, y, nx, ny, s * (0.06 - i * 0.008), p.horn, rng)
      if (i > 0 && rng.chance(0.85)) {
        const ba = a + side * rng.range(0.6, 1.1)
        const bl = s * rng.range(0.12, 0.26)
        slab(ctx, nx, ny, nx + Math.cos(ba) * bl, ny + Math.sin(ba) * bl, s * 0.035, p.horn, rng)
      }
      x = nx
      y = ny
      a += side * rng.range(-0.1, 0.28)
    }
  }
}

function drawTusks(ctx, p, rng, cx, cy, s, f) {
  for (const side of [-1, 1]) {
    const bx = cx + f * s * 0.3 + side * s * 0.08
    const by = cy + s * 0.16
    slab(ctx, bx, by, bx + f * s * 0.1, by - s * rng.range(0.24, 0.4), s * 0.045, '#e6dcc4', rng)
  }
}

function drawBeak(ctx, kind, p, rng, noise, x, y, s, f) {
  const len = kind === 'huge' ? s * 1.05 : kind === 'spear' ? s * 0.9 : s * 0.62
  const thick = kind === 'huge' ? s * 0.34 : kind === 'spear' ? s * 0.1 : s * 0.17
  const curve = kind === 'huge' ? s * 0.22 : 0
  const pts = [
    [x, y - thick * 0.5],
    [x + f * len, y - thick * 0.1 + curve * 0.3],
    [x + f * len * 0.96, y + thick * 0.18 + curve * 0.4],
    [x, y + thick * 0.55],
  ]
  shape(ctx, pts, p.beak, [p.beak, shade(p.beak, 0.2), shade(p.beak, -0.25)], rng, noise,
    { rough: 3, seed: 201, strokes: 12, width: 14, alpha: 0.3 })
  if (kind === 'huge') {
    // The toucan stripe.
    ctx.strokeStyle = rgba(shade(p.beak, -0.5), 0.8)
    ctx.lineWidth = s * 0.02
    ctx.beginPath()
    ctx.moveTo(x + f * len * 0.1, y + thick * 0.1)
    ctx.lineTo(x + f * len * 0.92, y + thick * 0.16)
    ctx.stroke()
  }
}

function drawCrown(ctx, g, rng, noise, cx, cy, s) {
  const p = g.palette
  if (g.crown === 'halo') {
    ctx.strokeStyle = rgba(p.gold, 0.9)
    ctx.lineWidth = s * 0.05
    ctx.beginPath()
    ctx.ellipse(cx, cy - s * 0.1, s * 0.52, s * 0.16, 0, 0, 6.3)
    ctx.stroke()
    return
  }
  if (g.crown === 'wreath') {
    for (let i = 0; i < 16; i++) {
      const a = Math.PI + (i / 15) * Math.PI
      const x = cx + Math.cos(a) * s * 0.44
      const y = cy + Math.sin(a) * s * 0.2 + s * 0.1
      slab(ctx, x, y, x + rng.range(-24, 24), y - rng.range(16, 40), s * 0.05, rng.pick(p.leaf), rng)
    }
    return
  }
  if (g.crown === 'helm') {
    shape(ctx, [
      [cx - s * 0.42, cy + s * 0.2], [cx - s * 0.34, cy - s * 0.24],
      [cx + s * 0.34, cy - s * 0.24], [cx + s * 0.42, cy + s * 0.2],
    ], p.metal[0], p.metal, rng, noise, { rough: 3, seed: 301, strokes: 12, width: 16, alpha: 0.3 })
    ctx.fillStyle = rgba('#0a0908', 0.85)
    ctx.fillRect(cx - s * 0.3, cy - s * 0.04, s * 0.6, s * 0.07)
    return
  }
  // crown
  const pts = [[cx - s * 0.42, cy + s * 0.18]]
  const spikes = rng.int(4, 6)
  for (let i = 0; i <= spikes; i++) {
    const t = i / spikes
    pts.push([cx - s * 0.42 + t * s * 0.84, cy - s * (i % 2 ? 0.06 : 0.32)])
  }
  pts.push([cx + s * 0.42, cy + s * 0.18])
  shape(ctx, pts, p.gold, [p.gold, shade(p.gold, 0.25), shade(p.gold, -0.3)], rng, noise,
    { rough: 3, seed: 302, strokes: 14, width: 12, alpha: 0.34 })
}

function drawCompanion(ctx, g, rng, noise) {
  if (g.companion === 'none') return
  const p = g.palette
  const x = rng.chance(0.5) ? rng.range(110, 260) : rng.range(W - 260, W - 110)
  const y = GROUND - rng.range(0, 30)
  const s = rng.range(0.55, 0.9)
  if (g.companion === 'bird') return drawSmallBird(ctx, g, rng, noise, x, y - 40 * s, s * 0.8)

  // A small quadruped: body, head, ears, legs, tail.
  const bodyC = rng.pick(p.fur)
  shape(ctx, ellipsePts(x, y - 52 * s, 66 * s, 40 * s, 20), bodyC, p.fur, rng, noise,
    { rough: 4, seed: 401, strokes: 10, width: 12, alpha: 0.25 })
  shape(ctx, ellipsePts(x - 58 * s, y - 84 * s, 32 * s, 30 * s, 16), bodyC, p.fur, rng, noise,
    { rough: 3, seed: 402, strokes: 6, width: 10, alpha: 0.2 })
  ctx.fillStyle = bodyC
  for (const dx of [-40, -14, 16, 42]) {
    ctx.fillRect(x + dx * s, y - 26 * s, 11 * s, 28 * s)
  }
  if (g.companion === 'cat') {
    ctx.beginPath()
    ctx.moveTo(x - 76 * s, y - 106 * s)
    ctx.lineTo(x - 66 * s, y - 140 * s)
    ctx.lineTo(x - 50 * s, y - 108 * s)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x - 46 * s, y - 108 * s)
    ctx.lineTo(x - 34 * s, y - 138 * s)
    ctx.lineTo(x - 24 * s, y - 104 * s)
    ctx.closePath()
    ctx.fill()
  }
  slab(ctx, x + 60 * s, y - 60 * s, x + 110 * s, y - rng.range(90, 130) * s, 10 * s, bodyC, rng)
  drawEye(ctx, p, rng, x - 66 * s, y - 88 * s, 60 * s)
}

// ------------------------------------------------------------------ frame ---
function drawForeground(ctx, g, rng, noise) {
  const p = g.palette

  if (g.glitch) glitchBars(ctx, -20, 0, W + 40, H, p.all, rng, rng.int(5, 11))

  if (g.drip) {
    const y = rng.range(H * 0.25, H * 0.75)
    drips(ctx, rng.range(0, W * 0.6), y, rng.range(W * 0.2, W * 0.5), rng.pick(p.field), rng, rng.int(4, 9))
  }

  // A hard vertical strip of a different picture down one edge — the source
  // works nearly always break their own frame somewhere.
  if (rng.chance(0.5)) {
    const x = rng.chance(0.5) ? 0 : W - rng.range(60, 150)
    const w = rng.range(50, 150)
    ctx.globalAlpha = 0.92
    shape(ctx, rectPts(x, -20, w, H + 40), rng.pick(p.field), p.all, rng, noise,
      { rough: 7, seed: 501, strokes: 26, width: 30, alpha: 0.32 })
    ctx.globalAlpha = 1
  }

  // Vignette, so the figure sits in a room rather than on a swatch.
  const vg = ctx.createRadialGradient(W / 2, H * 0.46, W * 0.2, W / 2, H * 0.5, W * 0.92)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(4,4,6,0.72)')
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, W, H)
}

// ------------------------------------------------------------------ draw ----
/**
 * Render a beast into a canvas context sized W x H.
 * The context is expected to already be scaled; this always draws at W x H.
 */
/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} g genome
 * @param {{cutout?: boolean}} [opts] cutout skips the painted ground and the
 *   foreground pass, leaving the figure alone on transparency — which is how it
 *   stands in the room on the landing page rather than sitting in a little frame.
 *
 * The rng is forked per part so that changing, say, the head code cannot shift
 * the palette or the pose of an already-published beast. Seeds are permanent
 * links here, so drift is a correctness bug, not a cosmetic one.
 */
export function drawBeast(ctx, g, opts = {}) {
  const rng = makeRng(g.seed * 2654435761 % 4294967296 || 7)
  const noise = makeNoise(makeRng(g.seed + 999))

  ctx.save()
  ctx.clearRect(0, 0, W, H)
  // Forked unconditionally, so a cutout and a full plate agree on every part.
  const backdropRng = rng.fork('backdrop')
  const wingsRng = rng.fork('wings')
  const bodyRng = rng.fork('body')
  const headRng = rng.fork('head')
  const compRng = rng.fork('companion')
  const fgRng = rng.fork('fg')

  if (!opts.cutout) drawBackdrop(ctx, g, backdropRng, noise)
  drawWings(ctx, g, wingsRng, noise)
  drawBody(ctx, g, bodyRng, noise)
  drawHead(ctx, g, headRng, noise)
  drawCompanion(ctx, g, compRng, noise)
  if (!opts.cutout) drawForeground(ctx, g, fgRng, noise)
  ctx.restore()
}

export { seedFromName }
