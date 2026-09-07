/**
 * BESTIARY.
 *
 * Type a name, get a beast. The name is hashed to a number and that number is
 * the entire animal — there is nothing to fetch and nothing to store, so a link
 * carrying the seed reproduces the picture exactly, on any machine, forever.
 */

import { genome, drawBeast, W, H } from './beast.js'
import { seedFromName, makeRng } from './rng.js'
import { title, describe, traits, rarity } from './naming.js'
import { theme, applyTheme, registerThemeProperties } from './color.js'
import { Wall } from './wall.js'
import { drawUndergrowth } from './undergrowth.js'

const $ = (s, r = document) => r.querySelector(s)
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

// Seeds for the beasts standing in the room when you arrive. Fixed, so the
// landing page is the same picture for everyone who is sent the link.
const MENAGERIE = [
  'the shepherd', 'nessus', 'the goose knight', 'pasture', 'the kitten',
  'assumption', 'notion', 'plate xi', 'the gannet', 'coronation',
]

const state = { wall: null, current: null }

function status(msg, ms = 2600) {
  const el = $('#status')
  el.textContent = msg
  el.classList.add('is-on')
  clearTimeout(status._t)
  status._t = setTimeout(() => el.classList.remove('is-on'), ms)
}

/**
 * Render a beast into a canvas at a chosen pixel height. Drawing always happens
 * at the native W x H and is scaled by the transform, so a thumbnail and the
 * full-size picture are the same composition rather than two different crops.
 */
function renderBeast(g, heightPx, opts = {}) {
  const cv = document.createElement('canvas')
  const dpr = Math.min(2, devicePixelRatio || 1)
  const scale = heightPx / H
  cv.width = Math.round(W * scale * dpr)
  cv.height = Math.round(heightPx * dpr)
  cv.style.height = heightPx + 'px'
  const ctx = cv.getContext('2d')
  ctx.scale((scale * dpr), (scale * dpr))
  drawBeast(ctx, g, opts)
  return cv
}

// ------------------------------------------------------------------ views ---
function showSummon() {
  $('#view-summon').hidden = false
  $('#view-result').hidden = true
  history.replaceState(null, '', location.pathname)
  lightFromMenagerie()
}

function showResult(g, name) {
  state.current = { g, name }
  $('#view-summon').hidden = true
  $('#view-result').hidden = false

  const t = theme(g.palette.field[0])
  applyTheme(t)

  const stage = $('#stage')
  stage.innerHTML = ''
  const cv = renderBeast(g, Math.round(Math.min(innerHeight * 0.74, 900)))
  cv.setAttribute('role', 'img')
  cv.setAttribute('aria-label', `${title(g)} — ${describe(g).join(' ')}`)
  stage.appendChild(cv)

  const r = rarity(g)
  $('#plate').innerHTML = `
    <span class="seedline mono">SEED ${String(g.seed).padStart(8, '0')}</span>
    <h2>${title(g)}</h2>
    <ul class="lines">${describe(g).map((l) => `<li>${l}</li>`).join('')}</ul>
    <div class="swatches">${g.palette.all.slice(0, 9)
      .map((c) => `<i style="background:${c}" title="${c}"></i>`).join('')}</div>
    <dl class="traits">${traits(g)
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    <div class="rarity">
      <span class="micro" style="color:var(--n-iron)">UNCOMMONNESS</span>
      <span class="bar"><span style="width:${r.score}%"></span></span>
      <span class="mono">${r.score}</span>
    </div>
    <div class="actions">
      <button class="btn ghost mono" id="copylink">Copy link</button>
      <button class="btn ghost mono" id="savepng">Save PNG</button>
      <button class="btn ghost mono" id="again">Another</button>
      <button class="btn ghost mono" id="back">Back</button>
    </div>`

  $('#copylink').addEventListener('click', copyLink)
  $('#savepng').addEventListener('click', savePng)
  $('#again').addEventListener('click', () => summonRandom())
  $('#back').addEventListener('click', showSummon)

  const url = new URL(location.href)
  url.search = name ? `?name=${encodeURIComponent(name)}` : `?seed=${g.seed}`
  url.hash = ''
  history.replaceState(null, '', url)
  document.title = `${title(g)} — BESTIARY`

  // The beast lights the room it is standing in.
  requestAnimationFrame(() => {
    const rect = cv.getBoundingClientRect()
    state.wall?.setLights([{
      x: rect.left, y: rect.top, w: rect.width, h: rect.height,
      color: t.glow, intensity: 0.5,
    }])
  })
}

// --------------------------------------------------------------- summoning --
function summonName(name) {
  const clean = String(name).trim()
  if (!clean) return status('Type something first.')
  showResult(genome(seedFromName(clean)), clean)
}

function summonSeed(seed) {
  showResult(genome(Number(seed) || 1), null)
}

function summonRandom() {
  // The one place a real random is correct: choosing which beast to look at.
  // The beast itself is still fully determined by the number it lands on.
  showResult(genome(Math.floor(Math.random() * 100000000)), null)
}

// ------------------------------------------------------------------ share ---
async function copyLink() {
  try {
    await navigator.clipboard.writeText(location.href)
    status('Link copied.')
  } catch {
    status(location.href, 6000)
  }
}

function savePng() {
  const g = state.current?.g
  if (!g) return
  const cv = renderBeast(g, 1400)
  cv.toBlob((blob) => {
    if (!blob) return status('Could not render the file.')
    const a = document.createElement('a')
    const url = URL.createObjectURL(blob)
    a.href = url
    a.download = `bestiary-${String(g.seed).padStart(8, '0')}.png`
    a.click()
    // Revoking immediately can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 10000)
    status('Saved.')
  }, 'image/png')
}

// ------------------------------------------------------------------- rail ---
function buildRail() {
  const rail = $('#rail')
  const plus = $('#plus')
  for (const fig of [...rail.querySelectorAll('.rail-beast')]) fig.remove()

  // Half the menagerie stands on each side of the empty plinth.
  const half = Math.ceil(MENAGERIE.length / 2)
  MENAGERIE.forEach((name, i) => {
    const g = genome(seedFromName(name))
    const fig = document.createElement('figure')
    fig.className = 'rail-beast'
    fig.dataset.name = name
    fig.appendChild(renderBeast(g, 190, { cutout: true }))
    const cap = document.createElement('figcaption')
    cap.className = 'micro'
    cap.textContent = String(g.seed).padStart(8, '0')
    fig.appendChild(cap)
    fig.addEventListener('click', () => showResult(g, name))
    fig.tabIndex = 0
    fig.setAttribute('role', 'button')
    fig.setAttribute('aria-label', `Open ${title(g)}`)
    fig.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showResult(g, name) }
    })
    if (i < half) rail.insertBefore(fig, plus)
    else rail.appendChild(fig)
  })

  // Open with the plinth in the middle of the viewport.
  requestAnimationFrame(() => {
    rail.scrollLeft = plus.offsetLeft - rail.clientWidth / 2 + plus.offsetWidth / 2
    lightFromMenagerie()
  })
}

/** On the landing page every beast in the rail contributes a little light. */
function lightFromMenagerie() {
  requestAnimationFrame(() => {
    const lights = []
    for (const fig of document.querySelectorAll('.rail-beast')) {
      const r = fig.getBoundingClientRect()
      if (r.right < 0 || r.left > innerWidth) continue
      const g = genome(seedFromName(fig.dataset.name ?? ''))
      lights.push({
        x: r.left, y: r.top, w: r.width, h: r.height,
        color: theme(g.palette.field[0]).glow,
        intensity: 0.34,
      })
    }
    state.wall?.setLights(lights)
    if (lights.length) applyTheme(theme(genome(seedFromName(MENAGERIE[0])).palette.field[0]))
  })
}

// ------------------------------------------------------------------- boot ---
function boot() {
  registerThemeProperties()
  state.wall = new Wall($('#wall'), { reducedMotion: reduced })

  const ug = $('#undergrowth')
  const paintUndergrowth = () => drawUndergrowth(ug)
  paintUndergrowth()
  addEventListener('resize', paintUndergrowth)

  buildRail()

  $('#namebar').addEventListener('submit', (e) => {
    e.preventDefault()
    summonName($('#nameinput').value)
  })
  $('#plus').addEventListener('click', summonRandom)
  $('#stranger').addEventListener('click', summonRandom)
  $('#home').addEventListener('click', showSummon)
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#view-result').hidden) showSummon()
  })
  addEventListener('scroll', () => {
    if ($('#view-result').hidden) lightFromMenagerie()
  }, { passive: true })
  $('#rail').addEventListener('scroll', lightFromMenagerie, { passive: true })

  // Deep link.
  const params = new URLSearchParams(location.search)
  if (params.get('name')) {
    $('#nameinput').value = params.get('name')
    summonName(params.get('name'))
  } else if (params.get('seed')) {
    summonSeed(params.get('seed'))
  } else {
    showSummon()
  }

  window.__diag = {
    get view() { return $('#view-result').hidden ? 'summon' : 'result' },
    get works() { return document.querySelectorAll('.rail-beast').length },
    get focus() { return state.current ? String(state.current.g.seed) : null },
    webgl: false,
  }
  window.__ready = true
}

boot()
