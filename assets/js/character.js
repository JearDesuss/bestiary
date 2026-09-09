import * as THREE from "three";
import { makeRng } from "./rng.js";

export function validSeed(value) {
  return /^(0|[1-9]\d{0,7})$/.test(String(value));
}
export const SPECIES = [
  {
    name: "Ram",
    line: "A patient soul with a wild inheritance. The horns remember every winter.",
  },
  {
    name: "Goose",
    line: "A knight of very particular convictions. A soft heart beneath borrowed armour.",
  },
  {
    name: "Tiger",
    line: "Regal, restless, and almost domesticated. The garden remembers otherwise.",
  },
  {
    name: "Stag",
    line: "A quiet visitor from the edge of the forest. Carrying the wilderness into every room.",
  },
  {
    name: "Cat",
    line: "An old soul with excellent posture. The entire kingdom is probably a sunbeam.",
  },
  {
    name: "Toucan",
    line: "Dressed for a ceremony nobody remembers. Bringing its own piece of the sky.",
  },
];
const PALETTES = [
  {
    name: "Crimson & old gold",
    cloth: "#752733",
    metal: "#b38b47",
    skin: "#bcac8e",
    accent: "#698e88",
  },
  {
    name: "Verdigris & ivory",
    cloth: "#24686b",
    metal: "#b1b2a1",
    skin: "#d6d0b7",
    accent: "#bc532e",
  },
  {
    name: "Ochre & midnight",
    cloth: "#a65d27",
    metal: "#c09c51",
    skin: "#c38b40",
    accent: "#374758",
  },
  {
    name: "Moss & faded rose",
    cloth: "#414f32",
    metal: "#b5a26d",
    skin: "#8a694d",
    accent: "#b76980",
  },
  {
    name: "Ink & saffron",
    cloth: "#b89a36",
    metal: "#858779",
    skin: "#333f42",
    accent: "#bc5768",
  },
  {
    name: "Ultramarine & coral",
    cloth: "#394c7b",
    metal: "#b18a4d",
    skin: "#304b4e",
    accent: "#d1755d",
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
];
export function composition(seed) {
  const rng = makeRng((seed ^ 0x62ba4211) >>> 0);
  const head = rng.int(0, 5),
    body = rng.int(0, 5);
  return {
    seed,
    head,
    body,
    palette: PALETTES[body],
    wings: rng.chance(0.48),
    crown: rng.chance(0.67),
    staff: rng.chance(0.55),
    build: rng.range(0.93, 1.08),
    title: `The ${SPECIES[head].name} ${rng.pick(EPITHETS)}`,
  };
}

// Real, closed, volumetric meshes. No planes carrying character pictures.
// Each paint surface is computed from the seed and assigned to its geometry.
export function createCharacter(g) {
  const group = new THREE.Group();
  group.name = g.title;
  const rng = makeRng(g.seed ^ 0x174cff),
    p = g.palette;
  const resources = new Set();
  const material = (colour, metalness = 0.0, roughness = 0.68) => {
    const m = new THREE.MeshStandardMaterial({
      color: colour,
      metalness,
      roughness,
      vertexColors: true,
    });
    resources.add(m);
    return m;
  };
  const cloth = material(p.cloth, 0.04, 0.94),
    metal = material(p.metal, 0.6, 0.61),
    skin = material(p.skin, 0.03, 0.76),
    accent = material(p.accent, 0.06, 0.81),
    bone = material("#d2c6a5", 0.08, 0.65),
    black = material("#111c1c", 0.12, 0.4),
    white = material("#dbd7bf", 0.02, 0.68),
    gold = material("#96733c", 0.7, 0.54),
    pink = material("#987477", 0.02, 0.8);
  function paint(geo, variation = 0.29) {
    const pos = geo.attributes.position,
      cs = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        y = pos.getY(i),
        z = pos.getZ(i);
      const grain =
        Math.sin(x * 82 + y * 73 + z * 39) * Math.sin(y * 31 - z * 67);
      const scumble = Math.sin(x * 19 + y * 13) * Math.cos(y * 27 - z * 11);
      const v = 0.88 + (grain * 0.35 + scumble * 0.65) * variation;
      cs.push(v, v * (0.99 + scumble * 0.025), v * (0.97 + grain * 0.035));
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(cs, 3));
    resources.add(geo);
    return geo;
  }
  function mesh(geo, mat, pos = [0, 0, 0], scale = [1, 1, 1], parent = group) {
    const m = new THREE.Mesh(paint(geo), mat);
    m.position.set(...pos);
    m.scale.set(...scale);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function ell(pos, scale, mat, parent = group, detail = 32) {
    return mesh(
      new THREE.SphereGeometry(1, detail, Math.max(12, detail / 2)),
      mat,
      pos,
      scale,
      parent,
    );
  }
  function tube(points, r1, r2, mat, parent = group, segments = 40) {
    const path = new THREE.CatmullRomCurve3(
      points.map((v) => new THREE.Vector3(...v)),
    );
    const geo = new THREE.TubeGeometry(path, segments, 1, 10, false),
      pos = geo.attributes.position;
    for (let i = 0; i <= segments; i++) {
      const c = path.getPointAt(i / segments),
        radius = r1 + (r2 - r1) * Math.pow(i / segments, 0.8);
      for (let j = 0; j <= 10; j++) {
        const n = i * 11 + j;
        pos.setXYZ(
          n,
          c.x + (pos.getX(n) - c.x) * radius,
          c.y + (pos.getY(n) - c.y) * radius,
          c.z + (pos.getZ(n) - c.z) * radius,
        );
      }
    }
    geo.computeVertexNormals();
    return mesh(geo, mat, [0, 0, 0], [1, 1, 1], parent);
  }
  function ring(y, radius, thickness, mat, parent = group, scale = [1, 1, 1]) {
    const m = mesh(
      new THREE.TorusGeometry(radius, thickness, 8, 64),
      mat,
      [0, y, 0],
      scale,
      parent,
    );
    m.rotation.x = Math.PI / 2;
    return m;
  }
  function lathe(
    profile,
    mat,
    pos = [0, 0, 0],
    scale = [1, 1, 1],
    parent = group,
  ) {
    return mesh(
      new THREE.LatheGeometry(
        profile.map((v) => new THREE.Vector2(...v)),
        48,
      ),
      mat,
      pos,
      scale,
      parent,
    );
  }

  // Long human proportions, articulated armour, broad shoulders and weighted cloth.
  const height = 4.7;
  for (const side of [-1, 1]) {
    const x = side * 0.27;
    ell([x, 0.16, 0.14], [0.21, 0.15, 0.37], black);
    ell([x, 0.64, 0], [0.18, 0.53, 0.19], metal);
    ell([x, 1.09, 0.06], [0.205, 0.21, 0.205], gold);
    ell([x * 1.08, 1.48, -0.025], [0.24, 0.46, 0.245], cloth);
    // Raised shin ridge and articulated knee plates catch side light.
    tube(
      [
        [x, 0.24, 0.22],
        [x, 0.64, 0.205],
        [x, 1.02, 0.2],
      ],
      0.033,
      0.017,
      gold,
    );
    ell([x, 1.08, 0.2], [0.13, 0.145, 0.068], metal);
  }
  lathe(
    [
      [0, 1.62],
      [0.38, 1.63],
      [0.43, 1.78],
      [0.37, 1.91],
      [0.34, 2.07],
      [0.43, 2.3],
      [0.53, 2.63],
      [0.46, 2.78],
      [0.25, 2.88],
      [0, 2.88],
    ],
    metal,
    [0, 0, 0],
    [g.build, 1, 0.72],
  );
  ring(1.83, 0.391, 0.048, gold, group, [1, 1, 0.73]);
  ring(2.78, 0.27, 0.06, gold, group, [1, 1, 0.85]);
  for (const side of [-1, 1]) {
    // Overlapping breastplate motifs and engraved seams.
    tube(
      [
        [0, 2.73, 0.28],
        [side * 0.24, 2.58, 0.38],
        [side * 0.35, 2.37, 0.29],
        [side * 0.2, 2.05, 0.255],
      ],
      0.016,
      0.01,
      gold,
    );
    const shoulder = ell([side * 0.54, 2.64, 0], [0.29, 0.25, 0.32], metal);
    shoulder.rotation.z = side * -0.3;
    const seam = ring(0, 0.22, 0.023, gold);
    seam.position.set(side * 0.56, 2.64, 0.06);
    seam.rotation.set(1.2, 0, side * 0.5);
    tube(
      [
        [side * 0.56, 2.59, 0],
        [side * 0.7, 2.27, 0.02],
        [side * 0.72, 2.0, 0.12],
      ],
      0.145,
      0.118,
      cloth,
    );
    ell([side * 0.71, 2.05, 0.1], [0.15, 0.16, 0.17], metal);
    tube(
      [
        [side * 0.72, 2.07, 0.1],
        [side * 0.74, 1.81, 0.2],
        [side * 0.72, 1.62, 0.27],
      ],
      0.136,
      0.09,
      metal,
    );
    ell([side * 0.72, 1.55, 0.28], [0.105, 0.14, 0.105], skin);
    for (let finger = 0; finger < 4; finger++)
      tube(
        [
          [side * 0.72 + (finger - 1.5) * 0.036, 1.51, 0.31],
          [side * 0.72 + (finger - 1.5) * 0.033, 1.41, 0.34],
          [side * 0.72 + (finger - 1.5) * 0.03, 1.39, 0.29],
        ],
        0.02,
        0.015,
        skin,
        group,
        8,
      );
  }
  // A closed draped cloak with sculpted vertical folds (front and back).
  const cloakPositions = [],
    cloakIndices = [],
    rows = 32,
    cols = 72;
  for (let y = 0; y <= rows; y++)
    for (let j = 0; j <= cols; j++) {
      const v = y / rows,
        t = j / cols,
        angle = 0.9 + t * (Math.PI * 2 - 1.8);
      const radius =
        0.53 +
        v * 0.11 +
        Math.sin(v * Math.PI) * 0.12 +
        Math.sin(angle * 12 + v * 1.4) * (0.018 + v * 0.03);
      cloakPositions.push(
        Math.sin(angle) * radius,
        2.69 - v * 2.03 - Math.cos(angle * 6) * v * 0.045,
        -Math.cos(angle) * radius * 0.84 - 0.045,
      );
    }
  for (let y = 0; y < rows; y++)
    for (let j = 0; j < cols; j++) {
      const a = y * (cols + 1) + j,
        b = a + cols + 1;
      cloakIndices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const cloakGeo = new THREE.BufferGeometry();
  cloakGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(cloakPositions, 3),
  );
  cloakGeo.setIndex(cloakIndices);
  cloakGeo.computeVertexNormals();
  const cloakMat = cloth.clone();
  cloakMat.side = THREE.DoubleSide;
  resources.add(cloakMat);
  const cloak = mesh(cloakGeo, cloakMat);
  cloak.rotation.y = Math.PI;
  for (let j = 0; j < 9; j++) {
    const angle = 0.35 + (j / 8) * 2.45;
    tube(
      [
        [Math.sin(angle) * 0.54, 2.6, -Math.cos(angle) * 0.48],
        [Math.sin(angle) * 0.68, 1.64, -Math.cos(angle) * 0.53],
        [Math.sin(angle) * 0.67, 0.68, -Math.cos(angle) * 0.57],
      ],
      0.012,
      0.017,
      gold,
    );
  }
  ell([0, 2.61, 0.335], [0.11, 0.15, 0.06], gold);
  ell([0, 2.61, 0.39], [0.055, 0.09, 0.026], accent);
  // Cross-body embroidered sash, deliberately asymmetrical like the paintings.
  tube(
    [
      [-0.4, 2.71, 0.21],
      [-0.23, 2.49, 0.355],
      [0, 2.21, 0.325],
      [0.31, 1.85, 0.22],
    ],
    0.065,
    0.075,
    accent,
  );
  for (let i = 0; i < 12; i++)
    ell(
      [-0.37 + i * 0.058, 2.67 - i * 0.068, 0.34],
      [0.014, 0.014, 0.015],
      gold,
      group,
      12,
    );
  // Botanical fragments become physical ornament, echoing the reference paintings.
  for (let flower = 0; flower < 5; flower++) {
    const x = -0.49 + flower * 0.035,
      y = 2.78 - flower * 0.105,
      z = 0.22 + flower * 0.013;
    tube(
      [
        [x, y - 0.12, z],
        [x - 0.03, y + 0.04, z],
      ],
      0.012,
      0.006,
      accent,
      group,
      8,
    );
    for (let petal = 0; petal < 5; petal++) {
      const a = (petal / 5) * Math.PI * 2,
        m = ell(
          [x + Math.cos(a) * 0.055, y + Math.sin(a) * 0.055, z],
          [0.042, 0.068, 0.022],
          flower % 2 ? pink : accent,
          group,
          16,
        );
      m.rotation.z = a - Math.PI / 2;
    }
    ell([x, y, z + 0.022], [0.027, 0.027, 0.026], gold, group, 12);
  }

  const head = new THREE.Group();
  head.position.set(0, 3.2, 0);
  group.add(head);
  let crownY = 0.76;
  const eye = (side, x, y, z, size = 0.065) => {
    ell([side * x, y, z], [size * 1.22, size, 0.05], black, head);
    ell([side * x, y, z + 0.036], [size * 0.73, size * 0.8, 0.026], gold, head);
    ell(
      [side * x, y, z + 0.056],
      [size * 0.29, size * 0.63, 0.012],
      black,
      head,
    );
    ell(
      [side * x - 0.014, y + 0.021, z + 0.068],
      [0.012, 0.012, 0.007],
      white,
      head,
      12,
    );
    tube(
      [
        [side * (x - 0.075), y + 0.035, z],
        [side * x, y + 0.065, z + 0.015],
        [side * (x + 0.075), y + 0.03, z],
      ],
      0.025,
      0.018,
      skin,
      head,
      12,
    );
  };
  if (g.head === 1 || g.head === 5) {
    const isGoose = g.head === 1,
      feather = isGoose ? white : skin;
    tube(
      [
        [0, -0.35, 0],
        [0, 0.05, 0.045],
        [0, 0.44, 0.02],
        [0, 0.71, 0.04],
      ],
      0.15,
      0.125,
      feather,
      head,
    );
    ell([0, 0.7, 0.06], [0.225, 0.28, 0.225], feather, head);
    eye(-1, 0.18, 0.76, 0.215, 0.047);
    eye(1, 0.18, 0.76, 0.215, 0.047);
    if (isGoose) {
      const upper = ell([0, 0.61, 0.35], [0.145, 0.065, 0.265], accent, head);
      upper.rotation.x = 0.11;
      ell([0, 0.58, 0.36], [0.14, 0.02, 0.25], gold, head);
      ell([-0.065, 0.65, 0.38], [0.013, 0.011, 0.025], black, head, 12);
      ell([0.065, 0.65, 0.38], [0.013, 0.011, 0.025], black, head, 12);
    } else {
      const beak = new THREE.Shape();
      beak.moveTo(0, 0);
      beak.bezierCurveTo(0.38, 0.29, 0.75, 0.28, 0.88, 0.01);
      beak.bezierCurveTo(0.59, -0.06, 0.27, -0.1, 0, -0.08);
      beak.closePath();
      const geo = new THREE.ExtrudeGeometry(beak, {
        depth: 0.13,
        bevelEnabled: true,
        bevelThickness: 0.045,
        bevelSize: 0.04,
        bevelSegments: 3,
        steps: 1,
      });
      const m = mesh(geo, gold, [-0.085, 0.61, 0.12], [1, 1, 1], head);
      m.rotation.y = -Math.PI / 2;
      ell([0, 0.67, 0.36], [0.14, 0.14, 0.15], accent, head);
      tube(
        [
          [0, 0.57, 0.27],
          [0, 0.57, 0.56],
          [0, 0.57, 0.94],
        ],
        0.023,
        0.006,
        black,
        head,
        24,
      );
    }
    crownY = 1.025;
  } else {
    const cat = g.head === 2 || g.head === 4,
      stag = g.head === 3;
    ell(
      [0, 0.23, 0.015],
      cat ? [0.34, 0.365, 0.285] : [0.27, 0.36, 0.285],
      skin,
      head,
    );
    ell([0, -0.1, 0.035], [0.19, 0.28, 0.195], skin, head);
    ell(
      [0, cat ? 0.02 : -0.035, 0.24],
      cat ? [0.24, 0.2, 0.23] : [0.19, 0.28, 0.24],
      skin,
      head,
    );
    if (cat) {
      for (const side of [-1, 1]) {
        ell([side * 0.12, -0.015, 0.397], [0.125, 0.09, 0.105], bone, head);
        ell([side * 0.285, 0.06, 0.08], [0.15, 0.225, 0.21], skin, head);
      }
      const nose = ell([0, 0.085, 0.485], [0.078, 0.042, 0.04], black, head);
      nose.rotation.z = Math.PI;
      tube(
        [
          [0, 0.05, 0.493],
          [0, -0.02, 0.481],
          [-0.1, -0.052, 0.47],
        ],
        0.009,
        0.005,
        black,
        head,
        12,
      );
      tube(
        [
          [0, -0.02, 0.481],
          [0.1, -0.052, 0.47],
        ],
        0.009,
        0.005,
        black,
        head,
        12,
      );
    } else {
      ell([0, -0.18, 0.405], [0.15, 0.105, 0.072], black, head);
      for (const side of [-1, 1])
        ell(
          [side * 0.075, -0.14, 0.467],
          [0.027, 0.017, 0.017],
          skin,
          head,
          16,
        );
      tube(
        [
          [-0.11, -0.245, 0.39],
          [0, -0.265, 0.428],
          [0.11, -0.245, 0.39],
        ],
        0.007,
        0.007,
        black,
        head,
        12,
      );
    }
    eye(-1, cat ? 0.2 : 0.17, 0.25, 0.267);
    eye(1, cat ? 0.2 : 0.17, 0.25, 0.267);
    for (const side of [-1, 1]) {
      const ear = ell(
        [side * 0.3, 0.45, 0.015],
        cat ? [0.12, 0.18, 0.07] : [0.21, 0.085, 0.087],
        skin,
        head,
      );
      ear.rotation.z = side * (cat ? -0.35 : 0.28);
      const inner = ell(
        [side * 0.3, 0.45, 0.075],
        cat ? [0.073, 0.12, 0.014] : [0.14, 0.047, 0.027],
        pink,
        head,
      );
      inner.rotation.z = ear.rotation.z;
    }
    if (g.head === 0) {
      for (const side of [-1, 1]) {
        const pts = [];
        for (let i = 0; i <= 38; i++) {
          const t = i / 38,
            a = t * Math.PI * 1.72,
            r = 0.32 * (1 - t * 0.62);
          pts.push([
            side * (0.29 + Math.sin(a) * r),
            0.41 + Math.cos(a) * r,
            -0.045 - t * 0.15,
          ]);
        }
        tube(pts, 0.12, 0.008, bone, head, 70);
        for (let i = 1; i < 24; i++) {
          const t = i / 24,
            a = t * Math.PI * 1.72,
            r = 0.32 * (1 - t * 0.62);
          ell(
            [
              side * (0.29 + Math.sin(a) * r),
              0.41 + Math.cos(a) * r,
              -0.045 - t * 0.15,
            ],
            [0.09 * (1 - t * 0.7), 0.025, 0.084 * (1 - t * 0.65)],
            gold,
            head,
            12,
          ).rotation.z = side * a;
        }
      }
      for (let i = 0; i < 28; i++) {
        const a = rng.range(0, Math.PI * 2),
          y = rng.range(0.25, 0.6);
        ell(
          [Math.sin(a) * 0.245, y, Math.cos(a) * 0.21],
          [0.045, 0.04, 0.045],
          bone,
          head,
          12,
        );
      }
    }
    if (stag) {
      for (const side of [-1, 1]) {
        tube(
          [
            [side * 0.18, 0.49, -0.06],
            [side * 0.29, 0.79, -0.12],
            [side * 0.38, 1.07, -0.06],
            [side * 0.51, 1.37, -0.08],
          ],
          0.065,
          0.008,
          bone,
          head,
        );
        for (let i = 0; i < 3; i++) {
          const y = 0.76 + i * 0.19,
            x = 0.28 + i * 0.08;
          tube(
            [
              [side * x, y, -0.08],
              [side * (x + 0.2), y + 0.16, -0.07],
              [side * (x + 0.3), y + 0.35, -0.09],
            ],
            0.036 - i * 0.005,
            0.003,
            bone,
            head,
            20,
          );
        }
      }
    }
    if (g.head === 2) {
      for (const side of [-1, 1])
        for (let i = 0; i < 5; i++) {
          const y = 0.48 - i * 0.095;
          tube(
            [
              [side * 0.27, y, 0.17],
              [side * 0.23, y - 0.025, 0.257],
              [side * 0.15, y - 0.04, 0.298],
            ],
            0.025,
            0.003,
            black,
            head,
            16,
          );
        }
      for (let i = 0; i < 3; i++)
        tube(
          [
            [(i - 1) * 0.105, 0.57, 0.16],
            [(i - 1) * 0.09, 0.47, 0.254],
            [(i - 1) * 0.07, 0.39, 0.28],
          ],
          0.024,
          0.002,
          black,
          head,
          14,
        );
    }
    crownY = 0.62;
  }
  if (g.crown && g.head !== 3) {
    ring(crownY, 0.224, 0.029, gold, head);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const m = mesh(
        new THREE.ConeGeometry(0.055, 0.19, 4),
        gold,
        [Math.sin(a) * 0.22, crownY + 0.082, Math.cos(a) * 0.22],
        [1, 1, 1],
        head,
      );
      m.rotation.y = a;
      ell(
        [Math.sin(a) * 0.224, crownY + 0.017, Math.cos(a) * 0.224],
        [0.028, 0.038, 0.028],
        accent,
        head,
        12,
      );
    }
  }
  // Feather wings have thickness, sculpted shafts and independently occluding forms.
  if (g.wings)
    for (const side of [-1, 1]) {
      for (let i = 0; i < 14; i++) {
        const t = i / 13,
          base = new THREE.Vector3(side * 0.36, 2.58, -0.18);
        const tip = new THREE.Vector3(
          side * (0.8 + Math.sin(t * Math.PI * 0.8) * 0.7),
          2.7 + Math.cos(t * Math.PI * 0.84) * 1.2,
          -0.33 - t * 0.15,
        );
        const mid = base.clone().lerp(tip, 0.54);
        mid.z -= 0.08;
        const feather = ell(
          mid.toArray(),
          [0.084, base.distanceTo(tip) * 0.52, 0.043],
          i % 4 === 0 ? accent : bone,
        );
        feather.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          tip.clone().sub(base).normalize(),
        );
        tube(
          [base.toArray(), mid.toArray(), tip.toArray()],
          0.016,
          0.002,
          gold,
          group,
          18,
        );
      }
    }
  if (g.staff) {
    tube(
      [
        [0.75, 0.02, 0.37],
        [0.75, 1.5, 0.35],
        [0.75, 3.42, 0.29],
      ],
      0.027,
      0.024,
      gold,
    );
    ell([0.75, 3.49, 0.29], [0.088, 0.13, 0.085], accent);
    ring(0, 0.12, 0.015, gold).position.set(0.75, 3.49, 0.29);
  }
  group.userData = {
    seed: g.seed,
    head: SPECIES[g.head].name,
    source: "authored-parametric-mesh",
    height,
  };
  group.userData.dispose = () => {
    resources.forEach((r) => r.dispose());
  };
  return group;
}
