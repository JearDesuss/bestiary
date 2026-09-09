import assert from 'node:assert/strict'
import { test } from 'node:test'
import { composition, validSeed } from '../assets/js/collage.js'
import { seedFromName } from '../assets/js/rng.js'

test('names normalize whitespace, Unicode width and case before hashing', () => {
  const variants = ['Ada Lovelace',' ada  lovelace ','ADA LOVELACE','Ａｄａ Lovelace']
  assert.equal(new Set(variants.map(seedFromName)).size, 1)
})
test('seeds are strict finite integers in the public eight-digit range', () => {
  for (const value of ['0',0,'99999999',12345678]) assert.ok(validSeed(value))
  for (const value of ['',null,undefined,'NaN','Infinity',-1,'1.5','1e4','100000000',' 1','01','<script>']) assert.ok(!validSeed(value), String(value))
})
test('zero has its own composition, and repeat rendering inputs are stable', () => {
  assert.notDeepEqual(composition(0),composition(1))
  for (const seed of [0,1,99999999,seedFromName('akbar')]) assert.deepEqual(composition(seed),composition(seed))
})
test('a broad sample produces all six heads and dresses with valid fragments', () => {
  const heads = new Set(), bodies = new Set(), combinations = new Set()
  for(let seed=0;seed<1000;seed++){
    const g=composition(seed)
    for (const part of [g.head,g.body,g.fragment]) assert.ok(Number.isInteger(part)&&part>=0&&part<6)
    assert.ok(g.cut>=.43&&g.cut<.49)
    heads.add(g.head);bodies.add(g.body);combinations.add(`${g.head}:${g.body}`)
  }
  assert.equal(heads.size,6);assert.equal(bodies.size,6);assert.equal(combinations.size,36)
})
