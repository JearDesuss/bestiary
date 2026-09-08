/**
 * Titles and plate copy.
 *
 * Every beast is catalogued in the same register as the archive it came out of:
 * flat, declarative, faintly deadpan, never whimsical. The copy is assembled
 * from the genome rather than from a bag of adjectives, so what it says is
 * always true of the picture — if a beast has no crown, nothing claims it does.
 */

import { makeRng } from './rng.js'
import { framing } from './beast.js'

const HEAD_NOUN = {
  ram: 'Ram', bull: 'Bull', antelope: 'Antelope', stag: 'Stag', tiger: 'Tiger',
  cat: 'Cat', boar: 'Boar', horse: 'Horse', hare: 'Hare', goose: 'Goose',
  toucan: 'Toucan', crane: 'Crane',
}

const HEAD_LINE = {
  ram: 'The head of a ram, and the horns have been growing longer than the body can account for.',
  bull: 'A bull\'s head, set square, with the weight of the whole animal still in it.',
  antelope: 'An antelope\'s head, narrow and alert, on a body that has stopped running.',
  stag: 'A stag\'s head, antlers included, which makes doorways a problem.',
  tiger: 'A tiger\'s head, and the mouth is doing something the shoulders are not.',
  cat: 'A cat\'s head, entirely unbothered, on a body that is clearly bothered.',
  boar: 'A boar\'s head, tusks up, on a posture that is not charging anything.',
  horse: 'A horse\'s head, long and patient, worn like a helmet nobody offered.',
  hare: 'A hare\'s head, ears up, listening to something outside the frame.',
  goose: 'A goose\'s head, and it is looking straight at you.',
  toucan: 'A toucan\'s head, the beak far too large, carried without comment.',
  crane: 'A crane\'s head on a long neck, the beak held like an instrument.',
}

const BODY_LINE = {
  armour: 'The body is in plate armour, buckled by somebody else.',
  drapery: 'The body is wrapped in drapery that belongs to a much older painting.',
  bare: 'The body is bare and photographic, and has not agreed to any of this.',
  fleece: 'The body is under a fleece, which may or may not be its own.',
}

const CROWN_LINE = {
  crown: 'A gold crown, worn rather than floating.',
  helm: 'A closed helm, visor down, over the animal head.',
  halo: 'A halo, thin and slightly off-centre.',
  wreath: 'A wreath of leaves, already going brown.',
}

const HELD_LINE = {
  staff: 'It is holding a staff, the way you hold something you were handed.',
  sword: 'It is holding a sword, point down. Nothing here needs a sword.',
  fleece: 'It is holding a fleece it has not decided whether to keep.',
  bird: 'It is holding a bird, and the bird is not struggling.',
}

const WING_LINE = {
  spread: 'The wings are open, and far too big for it.',
  folded: 'The wings are folded, which is somehow worse.',
}

const COMPANION_LINE = {
  cat: 'A cat sits at its feet, entirely uninterested.',
  bird: 'A small bird stands nearby, on the ground, where birds do not usually stand.',
  dog: 'A dog waits at the edge of the picture, wet.',
}

const EPITHET = [
  'in Borrowed Armour', 'Who Was Not Asked', 'at the Wrong Coronation',
  'Waiting to Be Told', 'and the Empty Suit', 'After the Procession',
  'Holding Still', 'in the Garden, Fenced Off', 'Who Will Not Sit',
  'and the Crown Nobody Wore', 'Out of Season', 'at the Far End of the Room',
  'Between Two Pictures', 'Left in the Frame', 'Who Heard Something',
  'and the Long Exposure', 'Cut From Another Painting', 'Under the Storm',
  'Facing the Wrong Way', 'and the Unlit Half',
]

const SUFFIX = [
  'Unworn', 'Interrupted', 'Recomposed', 'Off Duty', 'in Plate',
  'Crowned', 'Undressed', 'Mid-Sentence', 'Rehung', 'Overpainted',
]

/** A stable, seed-derived title. Two forms, so a wall of them has rhythm. */
export function title(g) {
  const rng = makeRng((g.seed ^ 0x5f3a7b1d) >>> 0)
  const noun = HEAD_NOUN[g.head] ?? 'Beast'
  if (rng.chance(0.55)) return `The ${noun} ${rng.pick(EPITHET)}`
  return `${noun}, ${rng.pick(SUFFIX)}`
}

/** The catalogue entry: only ever describes what is actually in the picture. */
export function describe(g) {
  const lines = [HEAD_LINE[g.head], BODY_LINE[g.body]]
  if (g.crown !== 'none') lines.push(CROWN_LINE[g.crown])
  if (g.wings !== 'none') lines.push(WING_LINE[g.wings])
  if (g.held !== 'none') lines.push(HELD_LINE[g.held])
  if (g.companion !== 'none') lines.push(COMPANION_LINE[g.companion])
  if (g.glitch) lines.push('Part of the picture has stopped rendering, and has been left that way.')
  return lines
}

/** The traits shown on the plate, in a fixed order so plates are comparable. */
export function traits(g) {
  return [
    ['Head', g.head],
    ['Body', g.body],
    ['Crown', g.crown],
    ['Wings', g.wings],
    ['Holding', g.held],
    ['Companion', g.companion],
    ['Palette', g.palette.name],
    ['Stance', g.stance],
    ['Framing', framing(g).mode],
  ]
}

/**
 * How unusual this beast is, as a percentage. Computed from the actual weights
 * in the genome so it is a real number rather than flattery: the product of each
 * chosen trait's probability, mapped onto a readable scale.
 */
const WEIGHTS = {
  body: { armour: 3 / 10, drapery: 3 / 10, bare: 2 / 10, fleece: 2 / 10 },
  crown: { none: 3 / 10, crown: 2 / 10, helm: 2 / 10, halo: 1 / 10, wreath: 2 / 10 },
  held: { none: 4 / 11, staff: 2 / 11, sword: 2 / 11, fleece: 1 / 11, bird: 2 / 11 },
  wings: { none: 5 / 9, spread: 2 / 9, folded: 2 / 9 },
  companion: { none: 4 / 9, cat: 2 / 9, bird: 2 / 9, dog: 1 / 9 },
  stance: { contrapposto: 5 / 7, stand: 2 / 7 },
}

export function rarity(g) {
  let p = 1 / 12 // the head, uniform over twelve
  for (const [key, table] of Object.entries(WEIGHTS)) p *= table[g[key]] ?? 1
  p *= 1 / 11 // the palette, uniform over eleven works
  // -log10 maps the vanishing probabilities onto something a person can read.
  const score = Math.min(100, Math.max(1, Math.round((-Math.log10(p) / 7) * 100)))
  return { probability: p, score }
}
