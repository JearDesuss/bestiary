import { seedFromName } from "./rng.js";
import { SPECIES, composition, validSeed } from "./character.js";
import { BeastViewer } from "./viewer.js";
let viewer;

const $ = (s) => document.querySelector(s);
const STORAGE = "bestiary-cabinet-v3";
let current = null,
  ready = false,
  timer,
  photoBusy = false;
let saved = readCabinet();
const escapeHTML = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function readCabinet() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE) || "[]");
    return Array.isArray(value)
      ? value
          .filter((x) => x && validSeed(x.seed) && typeof x.name === "string")
          .slice(0, 60)
          .map((x) => ({ seed: Number(x.seed), name: x.name.slice(0, 48) }))
      : [];
  } catch {
    return [];
  }
}
function status(message) {
  clearTimeout(timer);
  $("#status").textContent = message;
  $("#status").classList.add("is-on");
  timer = setTimeout(() => $("#status").classList.remove("is-on"), 4200);
}
function persist(next) {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(next));
    saved = next;
    updateSaved();
    return true;
  } catch {
    status(
      "Your browser could not save this. You can still download the character.",
    );
    return false;
  }
}
function updateSaved() {
  $("#saved-count").textContent = saved.length;
  const button = $("#keep");
  if (button) {
    const kept = saved.some((x) => x.seed === current?.g.seed);
    button.textContent = kept ? "Saved to cabinet ✓" : "Keep this beast +";
    button.setAttribute("aria-pressed", String(kept));
  }
}
function setURL(seed, name, push) {
  const url = new URL(location.href);
  url.search = "";
  url.hash = "";
  if (seed !== null) {
    if (name) url.searchParams.set("name", name);
    else url.searchParams.set("seed", seed);
    url.searchParams.set("v", "3");
  }
  if (url.href !== location.href)
    history[push ? "pushState" : "replaceState"](null, "", url);
}
function showHome(push = true) {
  $("#view-summon").hidden = false;
  $("#view-result").hidden = true;
  document.title = "Bestiary — find your other nature";
  setURL(null, "", push);
  window.scrollTo(0, 0);
}
function showResult(seed, name = "", push = true, focus = true) {
  if (!ready)
    return status("The characters are still loading. Try again in a moment.");
  const g = composition(seed);
  current = { g, name };
  $("#view-summon").hidden = true;
  $("#view-result").hidden = false;
  viewer.setModel(g);
  viewer.attach($("#stage"));
  $("#plate").innerHTML =
    `<p class="micro">YOUR OTHER NATURE · ${String(seed).padStart(8, "0")}</p><h2 id="beast-title" tabindex="-1">${g.title}</h2><p class="beast-description">${SPECIES[g.head].line}</p>${name ? `<p class="for-name">An other nature for ${escapeHTML(name)}.</p>` : ""}<dl class="traits"><div><dt>Nature</dt><dd>${SPECIES[g.head].name}</dd></div><div><dt>Palette</dt><dd>${g.palette.name}</dd></div><div><dt>Silhouette</dt><dd>${g.wings ? "Feathered" : "Cloaked"}</dd></div><div><dt>Headpiece</dt><dd>${g.crown ? "Crowned" : "Uncrowned"}</dd></div></dl><div class="actions"><button class="btn primary" id="savepng">Save image ↓</button><button class="btn" id="keep" aria-pressed="false">Keep this beast +</button></div><div class="result-secondary"><button id="copylink">Copy link ↗</button><button id="saveglb">Download 3D</button><button id="again">Meet another ⤨</button></div><p class="plate-note">Drag to turn / Scroll or pinch to zoom / Arrow keys to rotate</p>`;
  $("#savepng").addEventListener("click", savePNG);
  $("#keep").addEventListener("click", keep);
  $("#copylink").addEventListener("click", copyLink);
  $("#again").addEventListener("click", random);
  $("#saveglb").addEventListener("click", async () => {
    const seed = current.g.seed;
    try {
      const data = await viewer.exportGLB();
      downloadBlob(
        new Blob([data], { type: "model/gltf-binary" }),
        `bestiary-${seed}.glb`,
      );
      status("3D model ready to download.");
    } catch {
      status("The model could not be exported. Please try again.");
    }
  });
  setURL(seed, name, push);
  document.title = `${g.title} — Bestiary`;
  updateSaved();
  window.scrollTo(0, 0);
  if (focus) $("#beast-title").focus({ preventScroll: true });
}
function fromName() {
  const name = $("#nameinput")
    .value.normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
  if (!name) {
    status("Enter a name to find its beast.");
    $("#nameinput").focus();
    return;
  }
  showResult(seedFromName(name), name);
}
function random() {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  showResult(n[0] % 100000000);
}
async function copyLink() {
  try {
    await navigator.clipboard.writeText(location.href);
    status("Link copied. Let someone meet your beast.");
  } catch {
    const input = document.createElement("input");
    input.value = location.href;
    input.setAttribute("aria-label", "Copy this beast link");
    $("#plate").append(input);
    input.focus();
    input.select();
    status("Copy the selected link to share your beast.");
  }
}
function downloadBlob(blob, name) {
  const a = document.createElement("a"),
    url = URL.createObjectURL(blob);
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function savePNG() {
  const button = $("#savepng");
  const g = current.g;
  button.disabled = true;
  const cv = viewer.capture(1600, 2400);
  cv.toBlob((blob) => {
    button.disabled = false;
    if (!blob)
      return status("The image could not be exported. Please try again.");
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `bestiary-${String(g.seed).padStart(8, "0")}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    status("Artwork ready to download.");
  }, "image/png");
}
function keep() {
  const seed = current.g.seed;
  const exists = saved.some((x) => x.seed === seed);
  if (!exists && saved.length >= 60)
    return status("Your cabinet holds 60 beasts. Remove one to make room.");
  const next = exists
    ? saved.filter((x) => x.seed !== seed)
    : [...saved, { seed, name: current.name }];
  if (persist(next))
    status(
      exists
        ? "Beast removed from your cabinet."
        : "A keeper. Saved to your cabinet.",
    );
}
function portrait(seed, name = "", angle = 0) {
  const g = composition(seed);
  const button = document.createElement("button");
  button.className = "portrait";
  button.style.setProperty("--angle", `${angle}deg`);
  button.setAttribute("aria-label", `Meet ${g.title}`);
  button.append(viewer.thumbnail(g, 360));
  const cap = document.createElement("span");
  cap.className = "portrait-caption";
  cap.innerHTML = `<span>${SPECIES[g.head].name}</span><span>${String(seed).padStart(8, "0")}</span>`;
  button.append(cap);
  button.addEventListener("click", () => {
    if ($("#cabinet-dialog").open) $("#cabinet-dialog").close();
    showResult(seed, name);
  });
  return button;
}
function buildRail() {
  const rail = $("#rail"),
    plus = $("#plus");
  const seeds = [];
  for (let species = 0; species < 6; species++) {
    for (let s = 20000; s < 100000; s++) {
      const g = composition(s);
      if (g.head === species && g.body === species) {
        seeds.push(s);
        break;
      }
    }
  }
  seeds.forEach((seed, i) => {
    const card = portrait(seed, "", [-5, 3, -3, 4, -4, 3][i]);
    if (i < 3) rail.insertBefore(card, plus);
    else rail.append(card);
  });
  requestAnimationFrame(() => {
    rail.scrollLeft =
      plus.offsetLeft -
      rail.offsetLeft -
      rail.clientWidth / 2 +
      plus.offsetWidth / 2;
  });
}
function openCabinet() {
  const grid = $("#cabinet-grid");
  grid.replaceChildren();
  if (!saved.length) {
    const p = document.createElement("p");
    p.className = "cabinet-empty";
    p.textContent =
      "No keepers yet. Find a creature you love and choose “Keep this beast” to give it a home here.";
    grid.append(p);
  }
  for (const item of saved) {
    const wrap = document.createElement("div");
    wrap.className = "saved-item";
    wrap.append(portrait(item.seed, item.name));
    const remove = document.createElement("button");
    remove.className = "remove-saved";
    remove.textContent = "Remove from cabinet";
    remove.addEventListener("click", () => {
      if (persist(saved.filter((x) => x.seed !== item.seed))) {
        openCabinet();
        $("#cabinet-dialog .dialog-close").focus();
      }
    });
    wrap.append(remove);
    grid.append(wrap);
  }
  if (!$("#cabinet-dialog").open) $("#cabinet-dialog").showModal();
}
async function photo() {
  const file = $("#photo-input").files[0];
  if (!file || photoBusy) return;
  if (!file.type.startsWith("image/")) return status("Choose an image file.");
  if (file.size > 20 * 1024 * 1024)
    return status("Choose an image smaller than 20 MB.");
  photoBusy = true;
  $("#photo-button").disabled = true;
  try {
    const bytes = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const seed = new DataView(digest).getUint32(0) % 100000000;
    showResult(seed);
    status("A beast from your photo. The image stayed on your device.");
  } catch {
    status("That image could not be read. Try another file.");
  } finally {
    photoBusy = false;
    $("#photo-button").disabled = false;
    $("#photo-input").value = "";
  }
}
function route(push = false) {
  const params = new URLSearchParams(location.search);
  const name = params.get("name");
  const seed = params.get("seed");
  if (name?.trim()) {
    const clean = name
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 48);
    $("#nameinput").value = clean;
    showResult(seedFromName(clean), clean, push, false);
  } else if (seed !== null && validSeed(seed)) {
    showResult(Number(seed), "", push, false);
  } else {
    showHome(push);
    if (seed !== null)
      status("That seed is not valid. Find a beast with your name instead.");
  }
}
$("#home").addEventListener("click", () => {
  showHome();
  $("#nameinput").focus();
});
$("#back").addEventListener("click", () => {
  showHome();
  $("#nameinput").focus();
});
$("#namebar").addEventListener("submit", (e) => {
  e.preventDefault();
  fromName();
});
$("#plus").addEventListener("click", random);
$("#stranger").addEventListener("click", random);
$("#photo-button").addEventListener("click", () => {
  if (!ready) return status("The characters are still loading.");
  $("#photo-input").click();
});
$("#photo-input").addEventListener("change", photo);
for (const id of ["about-button", "credits-button"])
  $("#" + id).addEventListener("click", () => $("#about-dialog").showModal());
$("#cabinet-button").addEventListener("click", () => {
  if (!ready) return status("The characters are still loading.");
  openCabinet();
});
for (const dialog of document.querySelectorAll("dialog")) {
  dialog
    .querySelector(".dialog-close")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        dialog.close();
    }
  });
}
addEventListener("popstate", () => route());
addEventListener("keydown", (e) => {
  if (
    e.key === "Escape" &&
    !document.querySelector("dialog[open]") &&
    !$("#view-result").hidden
  ) {
    showHome();
    $("#nameinput").focus();
  }
});
updateSaved();
try {
  viewer = new BeastViewer();
  viewer.onContextLost = () =>
    status("The 3D display was interrupted. Reload to restore it.");
  ready = true;
  buildRail();
  $("#loading").hidden = true;
  route();
  window.__ready = true;
} catch (error) {
  $("#loading").textContent =
    "WebGL could not start. Enable hardware acceleration and reload.";
  status(
    "Your browser could not start the 3D display. Enable hardware acceleration and reload.",
  );
  console.error(error);
}
window.__diag = {
  get view() {
    return $("#view-result").hidden ? "summon" : "result";
  },
  get works() {
    return $("#rail").querySelectorAll(".portrait").length;
  },
  get focus() {
    return current?.g.seed ?? null;
  },
  webgl: true,
  get geometry() {
    return viewer?.diagnostics();
  },
};
