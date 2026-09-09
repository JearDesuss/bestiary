import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { composition, createCharacter } from "../assets/js/character.js";

test("all six natures have finite mesh geometry with actual depth and unique anatomy", () => {
  const samples = [];
  for (let head = 0; head < 6; head++) {
    let g;
    for (let seed = 0; seed < 2000; seed++) {
      g = composition(seed);
      if (g.head === head) break;
    }
    const model = createCharacter(g),
      box = new THREE.Box3().setFromObject(model),
      size = box.getSize(new THREE.Vector3());
    assert.ok(size.x > 1 && size.y > 3.5 && size.z > 0.5);
    let count = 0,
      vertices = 0;
    model.traverse((o) => {
      if (o.isMesh) {
        count++;
        const p = o.geometry.attributes.position;
        vertices += p.count;
        for (const n of p.array) assert.ok(Number.isFinite(n));
        assert.ok(o.material.isMeshStandardMaterial);
      }
    });
    assert.ok(count > 70);
    assert.ok(vertices > 10000);
    samples.push(vertices);
    model.userData.dispose();
  }
  assert.equal(new Set(samples).size, 6);
});
test("same seed produces identical geometry and assigned material colours", () => {
  const describe = (model) => {
    const data = [];
    model.traverse((o) => {
      if (o.isMesh)
        data.push([
          o.geometry.attributes.position.count,
          ...o.position.toArray(),
          o.material.color.getHex(),
        ]);
    });
    return data;
  };
  const a = createCharacter(composition(1234)),
    b = createCharacter(composition(1234));
  assert.deepEqual(describe(a), describe(b));
  a.userData.dispose();
  b.userData.dispose();
});
