import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { gsap } from "gsap";
import { worlds, type Lang } from "./data";

const A = import.meta.env.BASE_URL + "media/";
const clamp = THREE.MathUtils.clamp;
const mix = THREE.MathUtils.lerp;
const CRT = { width: 2.14, height: (2.14 * 5) / 7, x: -0.04, y: 0.11, z: 1.16 };
const rounded = (w: number, h: number, r: number) => {
  const s = new THREE.Shape(),
    x = -w / 2,
    y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
};
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
// Conservative extents guarantee clearance at every intermediate selection.
export function shelfLayout(selection: number, count: number) {
  const poses = Array.from({ length: count }, (_, i) => {
    const emphasis = 1 - smooth(0, 1.25, Math.abs(i - selection));
    const ry = mix(1.05, 0.09, emphasis);
    const half =
      (1.6 * Math.cos(ry) + 0.48 * Math.sin(ry) + 2.72 * 0.035 * emphasis) / 2;
    return {
      x: 0,
      y: -0.07 + emphasis * 0.12,
      z: emphasis * 0.42,
      ry,
      emphasis,
      half,
    };
  });
  for (let i = 1; i < count; i++)
    poses[i].x = poses[i - 1].x + poses[i - 1].half + poses[i].half + 0.52;
  const bounded = clamp(selection, 0, count - 1),
    lo = Math.floor(bounded),
    hi = Math.ceil(bounded);
  const center = mix(poses[lo].x, poses[hi].x, bounded - lo);
  for (const pose of poses) pose.x -= center;
  return poses;
}

type BoxRig = { group: THREE.Group; flap: THREE.Group; cart: THREE.Group };
export class SaveScene {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  renderer: THREE.WebGLRenderer;
  boxes: BoxRig[] = [];
  console = new THREE.Group();
  shelf = new THREE.Group();
  root = new THREE.Group();
  screen!: THREE.Mesh;
  led!: THREE.Mesh;
  progress = { value: 0 };
  selection = { value: 2 };
  selected = 2;
  target = 0;
  inspect = false;
  reduced = false;
  lang: Lang = "en";
  dead = false;
  ready = false;
  frame = 0;
  width = 0;
  height = 0;
  consoleRequested = false;
  cartridgeInserted = false;
  private consoleBounds = new THREE.Box3(
    new THREE.Vector3(-1.9, -1.55, -1.2),
    new THREE.Vector3(1.9, 1.55, 1.3),
  );
  private shadowPose = { p: NaN, selection: NaN, width: 0, height: 0 };
  gameCanvas: HTMLCanvasElement;
  gameTexture: THREE.CanvasTexture;
  lastTime = 0;
  active = false;
  rafTimes: number[] = [];
  private observer: ResizeObserver;
  private onPointerDown: (e: PointerEvent) => void;
  private onPointerUp: (e: PointerEvent) => void;
  private onMove: (e: PointerEvent) => void;
  private start: { x: number; y: number; selection: number } | null = null;
  private drag = false;
  private cachedMaterials: THREE.Material[] = [];
  private coverTextures: THREE.Texture[] = [];
  private disposer: (() => void)[] = [];
  private screenCanvas = document.createElement("canvas");
  private screenTexture: THREE.CanvasTexture;
  private texLoader = new THREE.TextureLoader();
  private geometryCache = new Map<string, THREE.BufferGeometry>();
  private coversPending = worlds.length;
  private coversReady = 0;
  private coverErrors = 0;
  private resourcesLoaded = 0;
  private resourcesTotal = worlds.length * 2 + 1;
  private assetsPrepared = false;
  private worldImages = new Map<number, HTMLImageElement>();
  private transitionId = 0;
  private openingIndex = 2;
  private deferredSelection: number | null = null;
  private inspectPose = { value: 0 };
  private inspectAngle = 0;
  private projection = Array.from({ length: 4 }, () => new THREE.Vector3());
  constructor(
    public el: HTMLElement,
    public callbacks: {
      select: (i: number, source?: "tap" | "drag") => void;
      settled: (stage: number) => void;
      ready: () => void;
      resources?: (loaded: number, total: number) => void;
      assetsReady?: () => void;
      error: (s: string) => void;
      screenRect?: (x: number, y: number, w: number, h: number) => void;
      progress?: (p: number) => void;
    },
    gameCanvas: HTMLCanvasElement,
  ) {
    this.gameCanvas = gameCanvas;
    this.gameTexture = new THREE.CanvasTexture(gameCanvas);
    this.gameTexture.colorSpace = THREE.SRGBColorSpace;
    this.gameTexture.magFilter = THREE.NearestFilter;
    this.gameTexture.minFilter = THREE.LinearFilter;
    this.screenCanvas.width = 512;
    this.screenCanvas.height = 384;
    this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
    this.screenTexture.colorSpace = THREE.SRGBColorSpace;
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    el.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.renderer.domElement.style.touchAction = "pan-y";
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const env = new RoomEnvironment();
    const rt = pmrem.fromScene(env, 0.04);
    this.scene.environment = rt.texture;
    this.scene.environmentIntensity = 0.55;
    this.disposer.push(() => {
      rt.dispose();
      env.dispose();
      pmrem.dispose();
    });
    this.scene.add(new THREE.HemisphereLight(0xfff9e8, 0xa9a3a1, 1.5));
    const key = new THREE.DirectionalLight(0xfff2df, 2.3);
    key.position.set(-4, 8, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -12;
    key.shadow.camera.right = 12;
    key.shadow.camera.top = 10;
    key.shadow.camera.bottom = -8;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.035;
    key.shadow.radius = 4;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xc1d4fb, 1);
    fill.position.set(5, 3, -2);
    this.scene.add(fill);
    this.scene.add(this.root);
    this.root.add(this.shelf, this.console);
    this.reportCovers();
    this.buildBoxes();
    this.buildShelf();
    this.prepareConsole();
    this.callbacks.resources?.(0, this.resourcesTotal);
    this.loadConsole();
    this.drawStandby();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(el);
    this.resize();
    this.onPointerDown = (e) => {
      if (e.button !== 0 || this.target !== 0 || this.progress.value > 0.001)
        return;
      this.start = {
        x: e.clientX,
        y: e.clientY,
        selection: this.selection.value,
      };
      this.drag = false;
    };
    this.onMove = (e) => {
      if (!this.start || this.target !== 0) return;
      const dx = e.clientX - this.start.x,
        dy = e.clientY - this.start.y;
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        if (!this.drag) {
          gsap.killTweensOf(this.selection);
          this.el.setPointerCapture(e.pointerId);
        }
        this.drag = true;
        this.selection.value = clamp(
          this.start.selection - dx / (this.width < 700 ? 95 : 150),
          0,
          worlds.length - 1,
        );
        this.request();
      }
    };
    this.onPointerUp = (e) => {
      if (!this.start) return;
      const dx = e.clientX - this.start.x;
      const wasDrag = this.drag;
      const origin = this.start.selection;
      const dy = e.clientY - this.start.y;
      this.start = null;
      if (this.el.hasPointerCapture(e.pointerId))
        this.el.releasePointerCapture(e.pointerId);
      if (wasDrag) {
        this.setSelected(Math.round(this.selection.value));
        this.callbacks.select(
          Math.round(
            clamp(
              origin - dx / (this.width < 700 ? 95 : 150),
              0,
              worlds.length - 1,
            ),
          ),
          "drag",
        );
        return;
      }
      if (Math.hypot(dx, dy) > 12) return;
      if (this.target === 0 && this.progress.value < 0.001) {
        const rect = this.el.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((e.clientX - rect.left) / this.width) * 2 - 1,
          -((e.clientY - rect.top) / this.height) * 2 + 1,
        );
        const ray = new THREE.Raycaster();
        ray.setFromCamera(ndc, this.camera);
        const hit = ray.intersectObjects(
          this.boxes.map((b) => b.group),
          true,
        )[0];
        if (hit) {
          let ob: THREE.Object3D | null = hit.object;
          while (ob && ob.userData.world === undefined) ob = ob.parent;
          if (ob && typeof ob.userData.world === "number")
            this.callbacks.select(ob.userData.world, "tap");
        }
      }
    };
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointermove", this.onMove);
    el.addEventListener("pointerup", this.onPointerUp);
    const cancel = () => {
      this.start = null;
      this.setSelected(this.selected);
    };
    el.addEventListener("pointercancel", cancel);
    this.disposer.push(() => el.removeEventListener("pointercancel", cancel));
    const lost = (e: Event) => {
      e.preventDefault();
      this.callbacks.error("context");
    };
    this.renderer.domElement.addEventListener("webglcontextlost", lost);
    this.disposer.push(() =>
      this.renderer.domElement.removeEventListener("webglcontextlost", lost),
    );
    this.request();
  }
  private material(p: THREE.MeshStandardMaterialParameters) {
    const m = new THREE.MeshStandardMaterial(p);
    this.cachedMaterials.push(m);
    return m;
  }
  private mesh(g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[]) {
    const key = g.type + JSON.stringify((g as THREE.BoxGeometry).parameters);
    let shared = this.geometryCache.get(key);
    if (shared) g.dispose();
    else {
      shared = g;
      this.geometryCache.set(key, g);
    }
    const o = new THREE.Mesh(shared, m);
    o.castShadow = true;
    o.receiveShadow = true;
    return o;
  }
  private canvasTex(
    w: number,
    h: number,
    paint: (c: CanvasRenderingContext2D) => void,
  ) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    paint(c.getContext("2d")!);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    this.coverTextures.push(t);
    return t;
  }
  private buildBoxes() {
    worlds.forEach((w, i) => {
      const group = new THREE.Group();
      group.userData.world = i;
      const inside = this.material({ color: "#bcaa8f", roughness: 0.96 });
      const paper = this.material({ color: "#e1d5bc", roughness: 0.88 });
      const edge = this.material({ color: w.ink, roughness: 0.83 });
      // Never bind an empty network Texture to the first visible frame.
      const placeholder = this.canvasTex(256, 448, (c) => {
        c.fillStyle = "#e9dfca";
        c.fillRect(0, 0, 256, 448);
        c.strokeStyle = w.ink;
        c.lineWidth = 2;
        c.strokeRect(12, 12, 232, 424);
        c.fillStyle = w.ink;
        c.textAlign = "center";
        c.font = "bold 17px monospace";
        c.fillText("SAVE SLOT", 128, 47);
        c.font = "bold 29px monospace";
        w.title
          .split(" ")
          .forEach((word, line) => c.fillText(word, 128, 130 + line * 38));
        c.fillStyle = w.accent;
        c.fillRect(27, 232, 202, 8);
        c.fillStyle = w.ink;
        c.font = "bold 80px monospace";
        c.fillText(w.number, 128, 340);
        c.font = "15px monospace";
        c.fillText("SS—" + w.number, 128, 408);
      });
      const frontMat = this.material({ map: placeholder, roughness: 0.85 });
      const frontTex = this.texLoader.load(
        A + w.cover + "-cover.webp",
        (tex) => {
          if (this.dead) {
            tex.dispose();
            return;
          }
          frontMat.map = tex;
          frontMat.needsUpdate = true;
          this.coversPending--;
          this.coversReady++;
          this.resourceLoaded();
          this.reportCovers();
          this.request();
        },
        undefined,
        () => {
          if (this.dead) return;
          this.coversPending--;
          this.coverErrors++;
          this.callbacks.error("texture");
          this.reportCovers();
          this.request();
        },
      );
      frontTex.colorSpace = THREE.SRGBColorSpace;
      frontTex.anisotropy = 8;
      this.coverTextures.push(frontTex);
      const front = this.mesh(new THREE.BoxGeometry(1.55, 2.72, 0.025), [
        edge,
        edge,
        paper,
        paper,
        frontMat,
        inside,
      ]);
      front.position.z = 0.225;
      group.add(front);
      const spineTex = this.canvasTex(192, 896, (c) => {
        c.fillStyle = w.ink;
        c.fillRect(0, 0, 192, 896);
        c.strokeStyle = "#ead9a7";
        c.lineWidth = 5;
        c.strokeRect(5, 5, 182, 886);
        c.fillStyle = "#f7e8b8";
        c.textAlign = "center";
        c.font = "bold 22px monospace";
        c.fillText("SS—" + w.number, 96, 85);
        c.save();
        c.translate(96, 450);
        c.rotate(-Math.PI / 2);
        c.font = "bold 43px monospace";
        c.fillText(w.title, 0, 0);
        c.restore();
        c.font = "18px monospace";
        c.fillText("SAVE SLOT", 96, 825);
        c.fillStyle = w.accent;
        c.fillRect(35, 138, 120, 8);
      });
      const spine = this.material({ map: spineTex, roughness: 0.88 });
      for (const side of [-1, 1]) {
        const wall = this.mesh(new THREE.BoxGeometry(0.025, 2.72, 0.45), [
          spine,
          spine,
          paper,
          paper,
          paper,
          inside,
        ]);
        wall.position.x = side * 0.785;
        group.add(wall);
      }
      const backTex = this.canvasTex(512, 896, (c) => {
        c.fillStyle = w.ink;
        c.fillRect(0, 0, 512, 896);
        c.fillStyle = "#f2e6c7";
        c.font = "bold 36px monospace";
        const parts = w.title.split(" ");
        parts.forEach((p, j) => c.fillText(p, 35, 85 + j * 44));
        c.fillStyle = w.accent;
        c.fillRect(35, 210, 442, 8);
        c.font = "19px monospace";
        [
          "SIX SMALL WORLDS",
          "AN ORIGINAL CONCEPT",
          "SS—" + w.number,
          "OPEN. EXPLORE. RETURN.",
        ].forEach((p, j) => c.fillText(p, 35, 275 + j * 40));
        c.font = "18px monospace";
        c.fillText("SAVE SLOT", 35, 785);
        for (let k = 0; k < 42; k++) {
          c.fillRect(35 + k * 5, 824, 1 + (k % 3), 40);
        }
      });
      const back = this.mesh(new THREE.BoxGeometry(1.55, 2.72, 0.025), [
        edge,
        edge,
        paper,
        paper,
        inside,
        this.material({ map: backTex, roughness: 0.9 }),
      ]);
      back.position.z = -0.225;
      group.add(back);
      const bottom = this.mesh(new THREE.BoxGeometry(1.58, 0.025, 0.45), paper);
      bottom.position.y = -1.36;
      group.add(bottom);
      const flap = new THREE.Group();
      flap.position.set(0, 1.36, -0.225);
      const lid = this.mesh(new THREE.BoxGeometry(1.58, 0.026, 0.46), [
        paper,
        paper,
        edge,
        inside,
        paper,
        paper,
      ]);
      lid.position.z = 0.23;
      flap.add(lid);
      group.add(flap);
      const cart = new THREE.Group();
      const shell = this.material({ color: "#34383e", roughness: 0.69 });
      const cartBody = this.mesh(
        new RoundedBoxGeometry(0.98, 0.67, 0.16, 2, 0.035),
        shell,
      );
      cart.add(cartBody);
      const contacts = this.mesh(
        new THREE.BoxGeometry(0.72, 0.13, 0.095),
        this.material({ color: "#d4ac57", metalness: 0.65, roughness: 0.35 }),
      );
      contacts.position.y = -0.36;
      cart.add(contacts);
      for (let j = 0; j < 12; j++) {
        const groove = this.mesh(
          new THREE.BoxGeometry(0.014, 0.115, 0.1),
          shell,
        );
        groove.position.set(-0.32 + j * 0.058, -0.36, 0.003);
        cart.add(groove);
      }
      const labelTex = this.canvasTex(512, 304, (c) => {
        c.fillStyle = w.ink;
        c.fillRect(0, 0, 512, 304);
        c.fillStyle = "#f3e6bb";
        c.textAlign = "center";
        c.font = "bold 30px monospace";
        c.fillText(w.title, 256, 160);
      });
      const labelImage = new Image();
      labelImage.onload = () => {
        if (this.dead) return;
        this.worldImages.set(i, labelImage);
        const c = (labelTex.image as HTMLCanvasElement).getContext("2d")!;
        c.drawImage(labelImage, 0, 0, 512, 304);
        c.fillStyle = w.ink;
        c.fillRect(0, 225, 512, 79);
        c.fillStyle = "#f3e6bb";
        c.font = "bold 30px monospace";
        c.textAlign = "center";
        c.fillText(w.title, 256, 274);
        labelTex.needsUpdate = true;
        this.resourceLoaded();
        if (this.selected === i) this.drawStandby();
        this.request();
      };
      labelImage.onerror = () => {
        if (!this.dead) this.callbacks.error("texture");
      };
      labelImage.src = A + w.cover + "-world.webp";
      const label = this.mesh(
        new THREE.PlaneGeometry(0.78, 0.46),
        this.material({ map: labelTex, roughness: 0.8 }),
      );
      label.position.set(0, 0.035, 0.087);
      cart.add(label);
      cart.visible = false;
      this.root.add(cart);
      group.position.set(i * 0.95, 0, 0);
      this.root.add(group);
      this.boxes.push({ group, flap, cart });
    });
  }
  private reportCovers() {
    this.el.dataset.coverPending = String(this.coversPending);
    this.el.dataset.coversReady = String(this.coversReady);
    this.el.dataset.coverErrors = String(this.coverErrors);
  }
  private buildShelf() {
    const plank = this.mesh(
      new RoundedBoxGeometry(14, 0.16, 1.5, 2, 0.025),
      this.material({ color: "#d9cbb4", roughness: 0.94 }),
    );
    plank.position.y = -1.48;
    this.shelf.add(plank);
    const ground = this.mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.ShadowMaterial({ color: 0x433521, opacity: 0.15 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.57;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }
  private loadConsole() {
    if (this.consoleRequested) return;
    this.consoleRequested = true;
    const loader = new GLTFLoader();
    loader.load(
      A + "console.glb?v=9d3abce",
      (g) => {
        if (this.dead) {
          g.scene.traverse((o) => {
            if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose();
          });
          return;
        }
        // Measure locally before attaching to the animated rig.
        this.consoleBounds = new THREE.Box3().setFromObject(g.scene);
        this.console.add(g.scene);
        g.scene.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            const m = o as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
            for (const material of Array.isArray(m.material)
              ? m.material
              : [m.material]) {
              if (material instanceof THREE.MeshStandardMaterial) {
                material.normalMap = null;
                material.roughnessMap = null;
                material.metalnessMap = null;
                material.roughness = 0.78;
                material.metalness = 0;
              }
            }
          }
        });
        this.ready = true;
        this.resourceLoaded();
        if (this.target > 0) this.setStage(this.target);
        this.callbacks.ready();
        this.request();
      },
      undefined,
      () => {
        if (!this.dead) {
          this.callbacks.error("model");
          this.request();
        }
      },
    );
  }
  private prepareConsole() {
    // Screen, indicator and slot are independent controllable surfaces, never baked game artwork.
    // One measured opening drives the physical bezel, glass mask and HTML projection.
    const surround = rounded(2.44, 1.84, 0.23);
    surround.holes.push(rounded(CRT.width, CRT.height, 0.15));
    const bezel = this.mesh(
      new THREE.ExtrudeGeometry(surround, {
        depth: 0.045,
        bevelEnabled: true,
        bevelSize: 0.012,
        bevelThickness: 0.012,
        bevelSegments: 2,
        steps: 1,
        curveSegments: 12,
      }),
      this.material({ color: 0x202b3b, roughness: 0.8 }),
    );
    bezel.position.set(CRT.x, CRT.y, 1.11);
    this.console.add(bezel);
    const display = new THREE.PlaneGeometry(CRT.width, CRT.height, 16, 12);
    const pos = display.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        y = pos.getY(i);
      pos.setZ(
        i,
        0.024 *
          (1 - (x / (CRT.width / 2)) ** 2) *
          (1 - (y / (CRT.height / 2)) ** 2),
      );
    }
    display.computeVertexNormals();
    const mask = this.canvasTex(512, 366, (c) => {
      c.fillStyle = "#000";
      c.fillRect(0, 0, 512, 366);
      c.fillStyle = "#fff";
      c.beginPath();
      c.roundRect(0, 0, 512, 366, 36);
      c.fill();
    });
    this.screen = new THREE.Mesh(
      display,
      new THREE.MeshBasicMaterial({
        map: this.screenTexture,
        alphaMap: mask,
        transparent: true,
        toneMapped: false,
      }),
    );
    this.screen.position.set(CRT.x, CRT.y, CRT.z);
    this.console.add(this.screen);
    this.led = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x8caf4e }),
    );
    this.led.position.set(1.28, -0.41, 1.02);
    this.console.add(this.led);
  }
  private drawStandby() {
    const c = this.screenCanvas.getContext("2d")!;
    const w = worlds[this.selected];
    c.fillStyle = w.ink;
    c.fillRect(0, 0, 512, 384);
    const index = this.selected;
    const language = this.lang;
    const im = this.worldImages.get(index);
    if (im) {
      if (this.dead || this.selected !== index || this.lang !== language)
        return;
      c.drawImage(im, 0, 0, 512, 384);
      c.fillStyle = "rgba(5,20,20,.25)";
      c.fillRect(0, 0, 512, 384);
      c.fillStyle = "#fff0bd";
      c.textAlign = "center";
      c.font = "bold 25px monospace";
      c.fillText(
        this.cartridgeInserted
          ? language === "en"
            ? "CONCEPT VIEW"
            : "КОНЦЕПТ МИРА"
          : language === "en"
            ? "INSERT CARTRIDGE"
            : "ВСТАВЬТЕ КАРТРИДЖ",
        256,
        345,
      );
      c.fillStyle = "#fff5d3";
      c.fillRect(182, 360, 148, 2);
      this.screenTexture.needsUpdate = true;
      this.request();
    }
    this.screenTexture.needsUpdate = true;
  }
  private resourceLoaded() {
    this.resourcesLoaded++;
    this.el.dataset.resourcesLoaded = String(this.resourcesLoaded);
    this.callbacks.resources?.(this.resourcesLoaded, this.resourcesTotal);
    if (this.resourcesLoaded !== this.resourcesTotal || this.assetsPrepared)
      return;
    for (const texture of this.coverTextures)
      this.renderer.initTexture(texture);
    this.renderer.initTexture(this.screenTexture);
    this.renderer.initTexture(this.gameTexture);
    const visible = this.console.visible;
    this.console.visible = true;
    this.renderer
      .compileAsync(this.scene, this.camera)
      .then(() => {
        if (this.dead) return;
        this.assetsPrepared = true;
        this.request();
        requestAnimationFrame(() => {
          if (this.dead) return;
          this.el.dataset.resourceReady = "true";
          this.callbacks.assetsReady?.();
        });
      })
      .catch(() => {
        if (!this.dead) this.callbacks.error("webgl");
      });
    this.console.visible = visible;
  }
  setSelected(i: number) {
    i = clamp(Math.round(i), 0, worlds.length - 1);
    if (this.progress.value > 0.001 && i !== this.openingIndex) {
      this.deferredSelection = i;
      this.setStage(0);
      return;
    }
    this.deferredSelection = null;
    this.selected = i;
    if (this.progress.value < 0.001) this.openingIndex = i;
    gsap.to(this.selection, {
      value: i,
      duration: this.reduced ? 0.12 : 0.8,
      ease: "power2.inOut",
      overwrite: true,
      onUpdate: () => this.request(),
      onComplete: () => {
        if (this.target > 0 && this.progress.value < 0.001)
          this.setStage(this.target);
      },
    });
    this.drawStandby();
    this.request();
  }
  setStage(stage: number) {
    stage = clamp(stage, 0, 2);
    if (stage === this.target && gsap.isTweening(this.progress)) return;
    this.target = stage;
    if (stage > 0) this.deferredSelection = null;
    const id = ++this.transitionId;
    gsap.killTweensOf(this.progress);
    if (stage > 0 && !this.ready) {
      this.loadConsole();
      return;
    }
    if (stage > 0 && this.progress.value < 0.001)
      this.openingIndex = this.selected;
    // Finish the already-visible shelf selection before opening its box. This
    // retains the current tween, avoiding two coordinate systems moving at once.
    if (
      stage > 0 &&
      this.progress.value < 0.001 &&
      gsap.isTweening(this.selection) &&
      Math.abs(this.selection.value - this.selected) > 0.001
    )
      return;
    const from = this.progress.value;
    // Travel time follows the remaining route, including interrupted reversals.
    const routeTime = (v: number) =>
      Math.min(v, 1) * 1.65 + Math.max(0, v - 1) * 1.05;
    const duration = Math.max(
      0.08,
      Math.abs(routeTime(stage) - routeTime(from)),
    );
    gsap.to(this.progress, {
      value: stage,
      duration: this.reduced ? 0.12 : duration,
      ease: "sine.inOut",
      overwrite: true,
      onUpdate: () => this.request(),
      onComplete: () => {
        if (id !== this.transitionId || this.dead) return;
        if (stage === 0 && this.deferredSelection !== null) {
          const next = this.deferredSelection;
          this.deferredSelection = null;
          this.setSelected(next);
        }
        this.callbacks.settled(stage);
        this.request();
      },
    });
    this.request();
  }
  warmConsole() {
    this.loadConsole();
  }
  setGame(active: boolean, inserted = false) {
    this.active = active;
    if (this.cartridgeInserted !== inserted) {
      this.cartridgeInserted = inserted;
      this.drawStandby();
    }
    (this.screen.material as THREE.MeshBasicMaterial).map = active
      ? this.gameTexture
      : this.screenTexture;
    (this.screen.material as THREE.MeshBasicMaterial).needsUpdate = true;
    this.request();
  }
  updateGame() {
    this.gameTexture.needsUpdate = true;
    this.request();
  }
  setReduced(v: boolean) {
    this.reduced = v;
    if (v) this.setInspect(false);
    this.request();
  }
  setLanguage(v: Lang) {
    if (this.lang !== v) {
      this.lang = v;
      this.drawStandby();
      this.request();
    }
  }
  setInspect(v: boolean) {
    this.inspect = v;
    gsap.to(this.inspectPose, {
      value: v && !this.reduced ? 1 : 0,
      duration: 0.4,
      overwrite: true,
      onUpdate: () => this.request(),
    });
    this.request();
  }
  private resize() {
    this.width = Math.max(1, this.el.clientWidth);
    this.height = Math.max(1, this.el.clientHeight);
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    // setSize clears the drawing buffer. Draw before ResizeObserver's paint,
    // otherwise an animated container resize produces transparent frames.
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.render(performance.now());
  }
  request() {
    if (!this.frame && !this.dead)
      this.frame = requestAnimationFrame((t) => this.render(t));
  }
  private render(time: number) {
    this.frame = 0;
    if (this.dead) return;
    const p = this.progress.value,
      op = clamp(p, 0, 1),
      ins = clamp(p - 1, 0, 1),
      mobile =
        (typeof window === "undefined" ? this.width : window.innerWidth) < 700;
    this.callbacks.progress?.(p);
    const play = smooth(1, 2, p);
    const boxRetire = smooth(1.02, 1.42, p);
    const hero = smooth(1.42, 2, p);
    const poses = shelfLayout(this.selection.value, this.boxes.length);
    const shelfLeft = poses[0].x - poses[0].half;
    const shelfRight = poses[poses.length - 1].x + poses[poses.length - 1].half;
    const shelfCenter = (shelfLeft + shelfRight) / 2;
    // Frame full objects, not just the CRT. Stable endpoint envelopes avoid
    // chasing the console during its entrance and shrinking the entire scene.
    const model =
      this.consoleBounds ??
      new THREE.Box3(
        new THREE.Vector3(-1.9, -1.55, -1.2),
        new THREE.Vector3(1.9, 1.55, 1.3),
      );
    const scale = mobile ? 0.89 : 1;
    const radius =
      Math.max(Math.abs(model.min.x), Math.abs(model.max.x)) +
      Math.max(Math.abs(model.min.z), Math.abs(model.max.z)) *
        mix(0.28, 0.08, hero);
    const boxX = mobile ? -2.25 : -2.9;
    const left = mix(
      Math.min(boxX - 0.9, 0.4 - radius * scale),
      0.4 - radius * scale,
      hero,
    );
    const right = 0.4 + radius * scale;
    const bottom = Math.min(-1.5, model.min.y * scale - 0.05);
    const top = Math.max(2.38 - play * 0.58, model.max.y * scale - 0.05);
    const framing = smooth(0.23, 0.85, op);
    // Track the selected box while it travels, before tightening the lens.
    const focusX = mix(
      mobile ? 0 : shelfCenter,
      (left + right) / 2,
      smooth(0.23, 0.52, op),
    );
    const focusY = mix(-0.04, (top + bottom) / 2, framing);
    const viewW = mix(
      mobile ? 5.2 : Math.max(12.8, shelfRight - shelfLeft + 2.4),
      (right - left) * mix(1.22, 1.02, hero),
      framing,
    );
    const fitY = mix(
      mobile ? 4.3 : 4,
      (top - bottom) * mix(1.22, mobile ? 0.88 : 1.01, hero),
      framing,
    );
    this.camera.fov = mix(20, 26, framing);
    this.camera.updateProjectionMatrix();
    // Add front-most depth to the perspective fit.
    const depth = Math.max(1.4, model.max.z * scale) * framing;
    const distance =
      Math.max(viewW / this.camera.aspect, fitY) /
        2 /
        Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) +
      depth;
    this.camera.position.set(
      focusX,
      mix(2.7, focusY + distance * 0.075, framing),
      distance,
    );
    this.camera.lookAt(focusX, focusY, 0);
    this.camera.updateMatrixWorld();
    const departure =
      Math.max(viewW, fitY * this.camera.aspect) +
      Math.abs(shelfLeft) +
      Math.abs(shelfRight) +
      4;
    // Opening groups share one progress. Reverse traversal naturally extracts before packing.
    if (this.inspectPose.value > 0.001 && this.lastTime)
      this.inspectAngle += Math.min(0.05, (time - this.lastTime) / 1000) * 0.7;
    this.boxes.forEach((b, i) => {
      const sel = i === this.openingIndex;
      const { y, z, ry, emphasis: openAmount } = poses[i];
      let x = poses[i].x;
      if (sel) {
        const travel = smooth(0.24, 0.52, op);
        x = mix(x, mobile ? -2.25 : -2.9, travel);
        b.group.position.set(x, mix(y, -0.08, travel), mix(z, 0.12, travel));
        b.group.rotation.set(
          0,
          mix(ry, -0.15, travel),
          mix(-0.035 * openAmount, 0, travel),
        );
        b.group.scale.setScalar(
          mix(1, mobile ? 0.68 : 0.85, travel) * mix(1, 0.94, boxRetire),
        );
        b.flap.rotation.x = -1.95 * smooth(0.5, 0.67, op) * (1 - boxRetire);
        b.cart.visible = p > 0.66;
        const boxX = mobile ? -2.25 : -2.9;
        const top = 1.36 * (mobile ? 0.68 : 0.85);
        const cartClear = top + 0.61;
        const lift = smooth(0.66, 0.84, op),
          cross = smooth(0.84, 1, op);
        const slotX = mobile ? 0.33 : 0.4;
        const slotY = 1.32;
        const cx = mix(boxX, slotX, cross),
          cy = mix(0.3, cartClear, lift);
        b.cart.position.set(
          cx,
          mix(cy, slotY + 0.65, cross) - ins * 0.58,
          mix(0.12, -0.12, cross),
        );
        b.cart.rotation.set(
          0,
          mix(-0.15, mix(-0.28, -0.08, ins), cross) +
            Math.sin(this.inspectAngle) *
              0.4 *
              this.inspectPose.value *
              (1 - smooth(1, 1.1, p)),
          0,
        );
        b.cart.scale.setScalar(0.95);
      } else {
        const spread = smooth(0, 0.23, op);
        b.group.position.set(
          x + (i < this.openingIndex ? -1 : 1) * spread * departure,
          y - spread * 0.15,
          z,
        );
        b.group.rotation.set(0, ry, -0.035 * openAmount);
        b.group.scale.setScalar(1);
        b.cart.visible = false;
        b.flap.rotation.x = 0;
      }
      // Neighbors cannot leak back at very wide aspect ratios.
      b.group.visible = (sel && boxRetire < 1) || op < 0.23;
      const alpha = sel ? 1 - boxRetire : 1;
      b.group.traverse((object) => {
        if (!(object as THREE.Mesh).isMesh) return;
        const mesh = object as THREE.Mesh;
        for (const material of Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]) {
          if (material.userData.boxOpacity === undefined) {
            material.userData.boxOpacity = material.opacity;
            material.userData.boxTransparent = material.transparent;
            material.userData.boxDepthWrite = material.depthWrite;
          }
          const transparent = material.userData.boxTransparent || alpha < 1;
          if (material.transparent !== transparent) {
            material.transparent = transparent;
            material.needsUpdate = true;
          }
          material.opacity = material.userData.boxOpacity * alpha;
          material.depthWrite = material.userData.boxDepthWrite && alpha > 0.98;
        }
      });
    });
    this.shelf.position.y = -smooth(0.24, 0.7, op) * 5;
    const cp = smooth(0.36, 0.74, op);
    this.console.visible = cp > 0 && this.ready;
    this.console.position.set(mobile ? 0.33 : 0.4, mix(-0.18, -0.05, cp), -0.1);
    this.console.rotation.y = mix(-0.28, -0.08, ins);
    this.console.scale.setScalar((mobile ? 0.89 : 1.0) * mix(0.92, 1, cp));
    // Reveal in place rather than slicing the body through the canvas floor.
    this.console.traverse((object) => {
      if (!(object as THREE.Mesh).isMesh) return;
      const mesh = object as THREE.Mesh;
      for (const material of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]) {
        if (material.userData.revealOpacity === undefined) {
          material.userData.revealOpacity = material.opacity;
          material.userData.revealTransparent = material.transparent;
          material.userData.revealDepthWrite = material.depthWrite;
        }
        const transparent = material.userData.revealTransparent || cp < 1;
        if (material.transparent !== transparent) {
          material.transparent = transparent;
          material.needsUpdate = true;
        }
        material.opacity = material.userData.revealOpacity * cp;
        material.depthWrite = material.userData.revealDepthWrite && cp > 0.98;
      }
    });
    // Hide work-in-progress silhouette until actual model has loaded; fallback is handled by HTML.
    if (this.led)
      (this.led.material as THREE.MeshBasicMaterial).color.set(
        ins > 0.8 ? "#9fdb59" : "#5a653f",
      );
    if (
      this.shadowPose.p !== p ||
      this.shadowPose.selection !== this.selection.value ||
      this.shadowPose.width !== this.width ||
      this.shadowPose.height !== this.height ||
      (this.inspectPose.value > 0.001 && p > 0.95 && p < 1.1)
    ) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowPose = {
        p,
        selection: this.selection.value,
        width: this.width,
        height: this.height,
      };
    }
    this.renderer.render(this.scene, this.camera);
    if (this.callbacks.screenRect && p > 1) {
      const corners = [
        [-CRT.width / 2, -CRT.height / 2],
        [CRT.width / 2, -CRT.height / 2],
        [CRT.width / 2, CRT.height / 2],
        [-CRT.width / 2, CRT.height / 2],
      ].map(([x, y], i) =>
        this.screen
          .localToWorld(this.projection[i].set(x, y, 0.04))
          .project(this.camera),
      );
      const xs = corners.map((v) => ((v.x + 1) / 2) * this.width),
        ys = corners.map((v) => ((1 - v.y) / 2) * this.height);
      this.callbacks.screenRect(
        Math.min(...xs),
        Math.min(...ys),
        Math.max(...xs) - Math.min(...xs),
        Math.max(...ys) - Math.min(...ys),
      );
    }
    if (this.lastTime && time - this.lastTime < 200)
      this.rafTimes.push(time - this.lastTime);
    this.lastTime = time;
    if (this.rafTimes.length > 300) this.rafTimes.shift();
    if (this.inspectPose.value > 0.001 && p > 0.95 && p < 1.1) this.request();
  }
  dispose() {
    this.dead = true;
    cancelAnimationFrame(this.frame);
    gsap.killTweensOf(this.progress);
    gsap.killTweensOf(this.selection);
    gsap.killTweensOf(this.inspectPose);
    this.observer.disconnect();
    this.el.removeEventListener("pointerdown", this.onPointerDown);
    this.el.removeEventListener("pointermove", this.onMove);
    this.el.removeEventListener("pointerup", this.onPointerUp);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>(this.cachedMaterials);
    const textures = new Set<THREE.Texture>(this.coverTextures);
    this.scene.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return;
      const mesh = o as THREE.Mesh;
      geometries.add(mesh.geometry);
      for (const material of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material]) {
        materials.add(material);
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture) textures.add(value);
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    this.screenTexture.dispose();
    this.gameTexture.dispose();
    this.disposer.forEach((d) => d());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
