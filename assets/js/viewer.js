import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createCharacter } from "./character.js";

export class BeastViewer {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.04);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.4;
    pmrem.dispose();
    room.dispose();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
    this.scene.add(new THREE.HemisphereLight("#f7eaca", "#344e55", 1.3));
    const key = new THREE.DirectionalLight("#ffe6bf", 3.5);
    key.position.set(-3, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -2;
    key.shadow.normalBias = 0.018;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight("#83c2c5", 2.7);
    rim.position.set(4, 4, -3);
    this.scene.add(rim);
    const fill = new THREE.DirectionalLight("#f5ceb4", 0.85);
    fill.position.set(1, 2, 5);
    this.scene.add(fill);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ opacity: 0.22 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.y = -0.015;
    this.scene.add(ground);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = false;
    this.controls.enablePan = false;
    this.controls.minDistance = 4.8;
    this.controls.maxDistance = 13;
    this.controls.minPolarAngle = 0.5;
    this.controls.maxPolarAngle = 1.72;
    this.controls.addEventListener("change", () => this.render());
    this.renderer.domElement.setAttribute("role", "img");
    this.renderer.domElement.setAttribute("tabindex", "0");
    this.renderer.domElement.addEventListener("keydown", (e) => {
      if (
        ![
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "+",
          "-",
          "=",
        ].includes(e.key)
      )
        return;
      e.preventDefault();
      if (e.key === "Home") this.reset();
      else if (e.key === "+" || e.key === "=" || e.key === "-") {
        const d = this.camera.position.clone().sub(this.controls.target);
        d.multiplyScalar(e.key === "-" ? 1.12 : 0.88);
        d.clampLength(4.8, 13);
        this.camera.position.copy(this.controls.target).add(d);
        this.controls.update();
      } else {
        const d = this.camera.position.clone().sub(this.controls.target),
          s = new THREE.Spherical().setFromVector3(d);
        s.theta +=
          e.key === "ArrowLeft" ? -0.18 : e.key === "ArrowRight" ? 0.18 : 0;
        s.phi = THREE.MathUtils.clamp(
          s.phi +
            (e.key === "ArrowUp" ? -0.1 : e.key === "ArrowDown" ? 0.1 : 0),
          0.5,
          1.72,
        );
        this.camera.position
          .copy(this.controls.target)
          .add(new THREE.Vector3().setFromSpherical(s));
        this.controls.update();
      }
      this.render();
    });
    this.renderer.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.onContextLost?.();
    });
    this.renderer.domElement.addEventListener("webglcontextrestored", () =>
      this.render(),
    );
    this.observer = new ResizeObserver(() => this.resize());
    this.reset();
  }
  setModel(g) {
    this.model?.userData.dispose?.();
    if (this.model) this.scene.remove(this.model);
    this.model = createCharacter(g);
    this.scene.add(this.model);
    this.genome = g;
    this.renderer.domElement.setAttribute(
      "aria-label",
      `${g.title}. Interactive 3D sculpture. Drag to rotate, scroll to zoom, or use arrow keys.`,
    );
    this.reset();
  }
  reset() {
    this.controls.target.set(0, 2.2, 0);
    this.camera.position.set(4.1, 3.5, 8.9);
    this.controls.update();
    this.render();
  }
  attach(container) {
    this.container = container;
    container.replaceChildren(this.renderer.domElement);
    this.observer.disconnect();
    this.observer.observe(container);
    this.resize();
  }
  detach() {
    this.observer.disconnect();
    this.container = null;
    this.renderer.domElement.remove();
  }
  resize() {
    if (!this.container) return;
    const { width, height } = this.container.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.render();
  }
  render() {
    if (this.model) this.renderer.render(this.scene, this.camera);
  }
  thumbnail(g, width = 360) {
    const old = this.model,
      oldGenome = this.genome,
      oldPosition = this.camera.position.clone(),
      oldTarget = this.controls.target.clone(),
      oldAspect = this.camera.aspect,
      size = this.renderer.getSize(new THREE.Vector2()),
      ratio = this.renderer.getPixelRatio();
    if (old) this.scene.remove(old);
    const model = createCharacter(g);
    this.scene.add(model);
    this.model = model;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, width * 1.35, false);
    this.camera.aspect = 1 / 1.35;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(4.1, 3.5, 8.9);
    this.controls.target.set(0, 2.2, 0);
    this.controls.update();
    this.render();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = width * 1.35;
    canvas.getContext("2d").drawImage(this.renderer.domElement, 0, 0);
    canvas.setAttribute("role", "img");
    canvas.setAttribute(
      "aria-label",
      g.title + " — a three-dimensional sculpture",
    );
    this.scene.remove(model);
    model.userData.dispose();
    this.model = old;
    this.genome = oldGenome;
    if (old) this.scene.add(old);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(size.x, size.y, false);
    this.camera.aspect = oldAspect;
    this.camera.updateProjectionMatrix();
    this.camera.position.copy(oldPosition);
    this.controls.target.copy(oldTarget);
    this.controls.update();
    this.render();
    return canvas;
  }
  capture(width = 1600, height = 2000) {
    const size = this.renderer.getSize(new THREE.Vector2()),
      ratio = this.renderer.getPixelRatio(),
      aspect = this.camera.aspect;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.render();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#111411";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(this.renderer.domElement, 0, 0);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(size.x, size.y, false);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.render();
    return canvas;
  }
  async exportGLB() {
    const { GLTFExporter } =
      await import("three/addons/exporters/GLTFExporter.js");
    return new GLTFExporter().parseAsync(this.model, {
      binary: true,
      onlyVisible: true,
    });
  }
  // Entry point for a generated, textured model once the asset pipeline supplies
  // it. Normalize true geometry to the same human-scale stage, never a billboard.
  async loadGLB(url) {
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const { scene } = await new GLTFLoader().loadAsync(url);
    let meshes = 0;
    scene.traverse((o) => {
      if (o.isMesh) {
        meshes++;
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    if (!meshes)
      throw new Error("The generated file contains no mesh geometry.");
    const box = new THREE.Box3().setFromObject(scene),
      size = box.getSize(new THREE.Vector3()),
      center = box.getCenter(new THREE.Vector3());
    scene.scale.setScalar(4.5 / size.y);
    scene.position.set(
      -center.x * scene.scale.x,
      -box.min.y * scene.scale.y,
      -center.z * scene.scale.z,
    );
    this.model?.userData.dispose?.();
    if (this.model) this.scene.remove(this.model);
    this.model = scene;
    this.scene.add(scene);
    this.reset();
  }
  diagnostics() {
    let meshes = 0,
      triangles = 0;
    this.model?.traverse((o) => {
      if (o.isMesh) {
        meshes++;
        triangles +=
          (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
      }
    });
    const box = this.model
      ? new THREE.Box3().setFromObject(this.model).getSize(new THREE.Vector3())
      : new THREE.Vector3();
    return {
      webgl: true,
      meshes,
      triangles,
      depth: box.z,
      angle: this.controls.getAzimuthalAngle(),
      seed: this.genome?.seed,
    };
  }
}
