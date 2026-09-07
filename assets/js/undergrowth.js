/**
 * The undergrowth.
 *
 * A band of dark planting across the bottom of the room, so the beasts are
 * standing in something rather than floating on a black field. It is the
 * counterpart to the pixel meadow in the site this borrows its shape from, but
 * painted rather than tiled: leaf blades laid down with the same loaded-blade
 * stroke the beasts are drawn with, so the two never look like different media.
 *
 * Deterministic, so it does not reshuffle on every resize and pull the eye.
 */

import { makeRng } from './rng.js'
import { slab, rgba, shade } from './paint.js'

const GREENS = [
  '#101A0E', '#16240F', '#1D3315', '#24401A', '#2C4529',
  '#3A5A22', '#4E7939', '#25352A',
]

export function drawUndergrowth(canvas, seed = 20260908) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = Math.min(2, devicePixelRatio || 1)
  // Measure the viewport, not the canvas. Reading clientWidth back off a canvas
  // whose own width attribute this function sets is a feedback loop that
  // collapses it to its intrinsic size.
  const w = innerWidth
  const h = Math.round(innerHeight * 0.27)
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const rng = makeRng(seed)

  // Three depth bands. The far one is small, dark and dense; the near one is
  // large and almost black, so the middle band reads as the plane in focus.
  const bands = [
    { y: h * 0.34, count: Math.round(w / 9), len: [26, 78], wid: [6, 16], dark: 0.55, alpha: 0.55 },
    { y: h * 0.62, count: Math.round(w / 13), len: [54, 150], wid: [10, 30], dark: 0.2, alpha: 0.8 },
    { y: h * 1.02, count: Math.round(w / 26), len: [110, 280], wid: [22, 62], dark: 0.62, alpha: 1 },
  ]

  for (const band of bands) {
    for (let i = 0; i < band.count; i++) {
      const x = rng.range(-40, w + 40)
      const baseY = band.y + rng.range(-h * 0.04, h * 0.06)
      const len = rng.range(band.len[0], band.len[1])
      // Mostly upright, with enough spread that it never looks like a comb.
      const ang = -Math.PI / 2 + rng.range(-0.62, 0.62)
      const col = shade(rng.pick(GREENS), -band.dark)
      ctx.globalAlpha = band.alpha
      slab(ctx, x, baseY, x + Math.cos(ang) * len, baseY + Math.sin(ang) * len,
        rng.range(band.wid[0], band.wid[1]), col, rng)
    }
  }
  ctx.globalAlpha = 1

  // A few flowers, at the density of actual flowers rather than of a pattern.
  const petals = ['#C32D79', '#E7B11E', '#E7469A', '#D8531E', '#EEECE5']
  for (let i = 0; i < Math.round(w / 190); i++) {
    const x = rng.range(0, w)
    const y = rng.range(h * 0.42, h * 0.78)
    ctx.fillStyle = rgba(rng.pick(petals), rng.range(0.5, 0.9))
    ctx.beginPath()
    ctx.arc(x, y, rng.range(2, 5), 0, Math.PI * 2)
    ctx.fill()
  }

  // Fade the top edge into the room, so the band has no visible seam.
  const g = ctx.createLinearGradient(0, 0, 0, h * 0.5)
  g.addColorStop(0, 'rgba(8,8,10,1)')
  g.addColorStop(1, 'rgba(8,8,10,0)')
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h * 0.5)
  ctx.globalCompositeOperation = 'source-over'
}
