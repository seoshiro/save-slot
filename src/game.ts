export const COLS = 28,
  ROWS = 20,
  TILE = 16;
export const gameIds = [
  "dusk-delivery",
  "orbit-zero",
  "moss-signal",
  "tidebound",
  "ember-vault",
  "snowbyte",
] as const;
export type GameId = (typeof gameIds)[number];
export type Point = { x: number; y: number };
export type GameState = Point & {
  id: GameId;
  beacons: boolean[];
  won: boolean;
  elapsed: number;
  vx: number;
  vy: number;
  setbacks: number;
  checkpoint: number;
  cooldown: number;
};
export const beacons = [
  { x: 5.5, y: 5.5 },
  { x: 22.5, y: 5.5 },
  { x: 22.5, y: 15.5 },
];
export const portal = { x: 14.5, y: 3.5 };
export const gameSpecs: Record<
  GameId,
  { spawn: Point; objectives: Point[]; goal: Point }
> = {
  "moss-signal": {
    spawn: { x: 5.5, y: 16.5 },
    objectives: beacons,
    goal: portal,
  },
  "dusk-delivery": {
    spawn: { x: 4, y: 16 },
    objectives: [
      { x: 5, y: 4 },
      { x: 23, y: 4 },
      { x: 23, y: 16 },
    ],
    goal: { x: 4, y: 16 },
  },
  "orbit-zero": {
    spawn: { x: 4, y: 16 },
    objectives: [
      { x: 6, y: 4 },
      { x: 23, y: 5 },
      { x: 22, y: 16 },
    ],
    goal: { x: 4, y: 16 },
  },
  tidebound: {
    spawn: { x: 3.5, y: 10 },
    objectives: [
      { x: 10.5, y: 10 },
      { x: 17.5, y: 10 },
      { x: 24.5, y: 10 },
    ],
    goal: { x: 24.5, y: 7.5 },
  },
  "ember-vault": {
    spawn: { x: 4, y: 16 },
    objectives: [
      { x: 5, y: 4 },
      { x: 14, y: 4 },
      { x: 23, y: 4 },
    ],
    goal: { x: 23, y: 16 },
  },
  snowbyte: {
    spawn: { x: 4, y: 16 },
    objectives: [
      { x: 23, y: 16 },
      { x: 5, y: 10 },
      { x: 23, y: 4 },
    ],
    goal: { x: 24.5, y: 4 },
  },
};
export const grid = [
  "############################",
  "############################",
  "###########.......##########",
  "###...............##########",
  "###......................###",
  "###......................###",
  "###.......#####..........###",
  "###.......#####..........###",
  "###.......#####..........###",
  "###......................###",
  "###......................###",
  "###......................###",
  "###...........#####......###",
  "###...........#####......###",
  "###...........#####......###",
  "###......................###",
  "###......................###",
  "###......................###",
  "############################",
  "############################",
];

export const freshGame = (id: GameId = "moss-signal"): GameState => ({
  id,
  ...gameSpecs[id].spawn,
  beacons: [false, false, false],
  won: false,
  elapsed: 0,
  vx: 0,
  vy: 0,
  setbacks: 0,
  checkpoint: -1,
  cooldown: 0,
});
export function walkable(
  x: number,
  y: number,
  id: GameId = "moss-signal",
): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (id === "moss-signal") return grid[Math.floor(y)]?.[Math.floor(x)] === ".";
  if (x < 2 || x > 26 || y < 2 || y > 18) return false;
  if (id === "tidebound")
    return (
      (y >= 9 && y <= 11) ||
      (Math.abs(x - 24.5) < 1.6 && y >= 7) ||
      (Math.abs(x - 3.5) < 1.6 && y >= 8 && y <= 13)
    );
  if (id === "snowbyte")
    return (
      (y > 14 && y < 18) ||
      (x > 21 && x < 25 && y > 8) ||
      (y > 8 && y < 12) ||
      (x > 3 && x < 7 && y < 12) ||
      (y > 2 && y < 6)
    );
  if (id === "dusk-delivery")
    return !(
      (x > 9 && x < 19 && y > 3 && y < 6) ||
      (x > 9 && x < 19 && y > 14 && y < 17)
    );
  if (id === "ember-vault") return !(x > 9 && x < 19 && y > 6 && y < 14);
  return true;
}
function canMove(x: number, y: number, id: GameId = "moss-signal") {
  return [-0.23, 0.23].every((dx) =>
    [-0.23, 0.23].every((dy) => walkable(x + dx, y + dy, id)),
  );
}
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const progress = (s: GameState) => s.beacons.filter(Boolean).length;
export const status = (s: GameState) =>
  s.won
    ? "won"
    : s.cooldown > 0
      ? "setback"
      : s.beacons.every(Boolean)
        ? "ready"
        : "playing";
export function tideHigh(elapsed: number, crossing: number) {
  return (elapsed + crossing * 0.65) % 10 < 6;
}
export function fireOn(elapsed: number, row: number) {
  return (elapsed + row * 0.9) % 4.5 < 2.1;
}
export function hazards(s: GameState): (Point & { radius: number })[] {
  const t = s.elapsed;
  if (s.id === "dusk-delivery")
    return [8, 12].flatMap((y, i) =>
      [0, 12].map((offset) => ({
        x: 2 + ((t * (i ? -2.4 : 2.4) + offset + 240) % 24),
        y,
        radius: 0.8,
      })),
    );
  if (s.id === "orbit-zero")
    return [
      {
        x: 14 + Math.cos(t * 0.25) * 4,
        y: 10 + Math.sin(t * 0.25) * 3,
        radius: 1.05,
      },
      {
        x: 14 + Math.cos(t * 0.25 + Math.PI) * 4,
        y: 10 + Math.sin(t * 0.25 + Math.PI) * 3,
        radius: 1.05,
      },
    ];
  if (s.id === "snowbyte")
    return [
      { x: 14, y: 16.7, radius: 0.7 },
      { x: 14, y: 3.3, radius: 0.7 },
    ];
  return [];
}
function setback(s: GameState): GameState {
  const point =
    (s.id === "tidebound" || s.id === "snowbyte") && s.checkpoint >= 0
      ? gameSpecs[s.id].objectives[s.checkpoint]
      : gameSpecs[s.id].spawn;
  return {
    ...s,
    ...point,
    vx: 0,
    vy: 0,
    setbacks: s.setbacks + 1,
    cooldown: 1.2,
  };
}
export function advance(
  state: GameState,
  dx: number,
  dy: number,
  seconds: number,
): GameState {
  if (state.won || !Number.isFinite(seconds) || seconds <= 0) return state;
  const dt = Math.min(seconds, 0.05),
    id = state.id;
  let s = {
    ...state,
    beacons: [...state.beacons],
    elapsed: state.elapsed + dt,
    cooldown: Math.max(0, state.cooldown - dt),
  };
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
    dx = 0;
    dy = 0;
  }
  const n = Math.hypot(dx, dy);
  if (n) {
    dx /= n;
    dy /= n;
  }
  if (id === "orbit-zero" || id === "snowbyte") {
    const drag = id === "orbit-zero" ? 0.45 : 0.65,
      acceleration = id === "orbit-zero" ? 3.2 : 4.5,
      max = id === "orbit-zero" ? 2.5 : 2.6;
    s.vx = (s.vx + dx * acceleration * dt) * Math.exp(-drag * dt);
    s.vy = (s.vy + dy * acceleration * dt) * Math.exp(-drag * dt);
    const speed = Math.hypot(s.vx, s.vy);
    if (speed > max) {
      s.vx *= max / speed;
      s.vy *= max / speed;
    }
  } else {
    const speed =
      id === "moss-signal"
        ? 1.85
        : id === "tidebound"
          ? 1.2
          : id === "dusk-delivery"
            ? 2.2
            : 2.3;
    s.vx = dx * speed;
    s.vy = dy * speed;
  }
  if (canMove(s.x + s.vx * dt, s.y, id)) s.x += s.vx * dt;
  else s.vx = 0;
  if (canMove(s.x, s.y + s.vy * dt, id)) s.y += s.vy * dt;
  else s.vy = 0;
  let hit = hazards(s).some((h) => distance(s, h) < h.radius + 0.23);
  if (id === "tidebound")
    for (let i = 0; i < 3; i++)
      if (s.x > 6 + i * 7 && s.x < 8.5 + i * 7 && tideHigh(s.elapsed, i))
        hit = true;
  if (id === "ember-vault")
    for (let i = 0; i < 2; i++)
      if (Math.abs(s.y - (8 + i * 4)) < 0.48 && fireOn(s.elapsed, i))
        hit = true;
  if (hit && s.cooldown <= 0) return setback(s);
  if (["orbit-zero", "tidebound", "snowbyte"].includes(id))
    gameSpecs[id].objectives.forEach((p, i) => {
      if (
        !s.beacons[i] &&
        distance(s, p) < 0.9 &&
        (id === "orbit-zero" || i === progress(s))
      ) {
        s.beacons[i] = true;
        s.checkpoint = i;
      }
    });
  if (
    s.beacons.every(Boolean) &&
    distance(s, gameSpecs[id].goal) < 0.85 &&
    (id !== "orbit-zero" || Math.hypot(s.vx, s.vy) < 0.7)
  )
    s.won = true;
  return s;
}
export function activate(state: GameState): {
  state: GameState;
  activated: number;
} {
  if (state.won) return { state, activated: -1 };
  if (state.id === "orbit-zero" || state.id === "snowbyte")
    return {
      state: { ...state, vx: state.vx * 0.15, vy: state.vy * 0.15 },
      activated: -1,
    };
  if (state.id === "tidebound") return { state, activated: -1 };
  const i = gameSpecs[state.id].objectives.findIndex(
    (b, i) =>
      !state.beacons[i] &&
      distance(state, b) < 1.3 &&
      (state.id !== "ember-vault" || i === progress(state)),
  );
  if (i < 0) return { state, activated: -1 };
  return {
    state: { ...state, beacons: state.beacons.map((v, j) => j === i || v) },
    activated: i,
  };
}
export function parseGame(
  raw: unknown,
  expectedId: GameId = "moss-signal",
): GameState {
  const fallback = () => freshGame(expectedId);
  if (!raw || typeof raw !== "object") return fallback();
  const s = raw as GameState;
  if (
    (s.id ?? "moss-signal") !== expectedId ||
    !canMove(s.x, s.y, expectedId) ||
    !Array.isArray(s.beacons) ||
    s.beacons.length !== 3 ||
    s.beacons.some((v) => typeof v !== "boolean") ||
    !Number.isFinite(s.elapsed) ||
    s.elapsed < 0 ||
    typeof s.won !== "boolean" ||
    (s.won && !s.beacons.every(Boolean))
  )
    return fallback();
  for (const k of ["vx", "vy", "setbacks", "checkpoint", "cooldown"] as const)
    if (s[k] !== undefined && !Number.isFinite(s[k])) return fallback();
  if (
    (s.setbacks ?? 0) < 0 ||
    (s.cooldown ?? 0) < 0 ||
    Math.abs(s.vx ?? 0) > 5 ||
    Math.abs(s.vy ?? 0) > 5
  )
    return fallback();
  const count = progress(s);
  if (
    ["tidebound", "snowbyte", "ember-vault"].includes(expectedId) &&
    s.beacons.some((v, i) => v && i >= count)
  )
    return fallback();
  if (
    s.checkpoint !== undefined &&
    (!Number.isInteger(s.checkpoint) ||
      s.checkpoint < -1 ||
      s.checkpoint > 2 ||
      (s.checkpoint >= 0 && !s.beacons[s.checkpoint]))
  )
    return fallback();
  return {
    ...fallback(),
    x: s.x,
    y: s.y,
    beacons: [...s.beacons],
    won: s.won,
    elapsed: Math.min(s.elapsed, 86400),
    vx: s.vx ?? 0,
    vy: s.vy ?? 0,
    setbacks: Math.floor(s.setbacks ?? 0),
    checkpoint: s.checkpoint ?? -1,
    cooldown: Math.min(s.cooldown ?? 0, 1.2),
  };
}
const noise = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
const ignition = [-1e6, -1e6, -1e6];
let previousSignals = 0;
function paintMoss(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  time: number,
  active: boolean,
  touch = false,
) {
  const W = COLS * TILE,
    H = ROWS * TILE;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#092d2d";
  ctx.fillRect(0, 0, W, H);
  const signals = s.beacons.reduce((mask, v, i) => mask | (v ? 1 << i : 0), 0);
  if (!signals) ignition.fill(-1e6);
  s.beacons.forEach((v, i) => {
    if (v && !(previousSignals & (1 << i))) ignition[i] = time;
  });
  previousSignals = signals;
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      const n = noise(x, y);
      let px = x * TILE,
        py = y * TILE;
      if (grid[y][x] === "#") {
        ctx.fillStyle = n > 0.6 ? "#0c3b39" : "#0b3334";
        ctx.fillRect(px, py, 16, 16);
        ctx.fillStyle = "#255a52";
        if (n > 0.4) ctx.fillRect(px + Math.floor(n * 8), py + 8, 7, 1);
        if (n > 0.73) {
          ctx.fillStyle = "#477b52";
          ctx.fillRect(px + 2, py + 1, 3, 5);
          ctx.fillRect(px + 5, py, 2, 3);
        }
      } else {
        const path =
          Math.abs(x - 5) < 1.5 ||
          Math.abs(y - 5) < 1.5 ||
          Math.abs(y - 16) < 1.3 ||
          Math.abs(x - 22) < 1.5;
        ctx.fillStyle = path
          ? n > 0.5
            ? "#65765b"
            : "#718369"
          : n > 0.5
            ? "#315c40"
            : "#3a6644";
        ctx.fillRect(px, py, 16, 16);
        if (path) {
          ctx.fillStyle = "#485e4c";
          if (n > 0.7) ctx.fillRect(px + 3, py, 10, 1);
          if (n < 0.3) ctx.fillRect(px, py + 3, 1, 8);
          if (n > 0.6) ctx.fillRect(px + 5, py + 8, 6, 1);
          ctx.fillStyle = "#9a9c70";
          ctx.fillRect(px + 2, py + 2, 5, 1);
        } else {
          ctx.fillStyle = n > 0.7 ? "#8caa58" : "#507d42";
          ctx.fillRect(px + Math.floor(n * 10), py + 3, 2, 5);
          if (n > 0.87) {
            ctx.fillStyle = "#d1bd64";
            ctx.fillRect(px + 8, py + 10, 2, 2);
          }
        }
      }
    }
  // The ruins are structural obstacles, not just a painted background.
  // Layered foliage stays on blocked terrain; silhouettes still mark collision edges.
  const shrub = (x: number, y: number, radius: number, seed: number) => {
    ctx.fillStyle = "#062d29";
    ctx.fillRect(x - radius, y, radius * 2 + 4, radius);
    for (let j = 0; j < 7; j++) {
      const nx = Math.floor(noise(seed, j) * radius * 1.6 - radius * 0.8);
      const ny = Math.floor(noise(j, seed) * radius * 0.8);
      ctx.fillStyle = ["#144e3b", "#216344", "#35764a", "#4d8950"][j % 4];
      ctx.fillRect(x + nx - 8, y + ny - radius, 16, 10);
      ctx.fillStyle = j % 3 ? "#609950" : "#8ba957";
      ctx.fillRect(x + nx - 4, y + ny - radius, 7, 2);
    }
  };
  for (let j = 0; j < 16; j++) {
    shrub(15 + j * 29, 20 + (j % 3) * 5, 18, j + 3);
    shrub(12 + j * 29, H - 5, 21, j + 33);
  }
  for (let j = 0; j < 9; j++) {
    shrub(16, 40 + j * 28, 22, j + 61);
    shrub(W - 16, 40 + j * 28, 22, j + 90);
  }
  // Ferns cling to the two impassable ruins, never across the walking corridor.
  [
    [11, 7],
    [13, 7],
    [15, 13],
    [17, 13],
  ].forEach(([x, y], i) => shrub(x * TILE, y * TILE, 17, i + 120));
  for (const [x, y] of [
    [10, 6],
    [12, 7],
    [13, 8],
    [14, 12],
    [16, 13],
    [17, 14],
  ]) {
    ctx.fillStyle = "#243f36";
    ctx.fillRect(x * TILE - 3, y * TILE + 6, 17, 21);
    ctx.fillStyle = "#617664";
    ctx.fillRect(x * TILE - 3, y * TILE - 9, 15, 27);
    ctx.fillStyle = "#94a17b";
    ctx.fillRect(x * TILE - 3, y * TILE - 10, 15, 5);
    ctx.fillStyle = "#3d5949";
    ctx.fillRect(x * TILE + 8, y * TILE - 5, 4, 22);
    ctx.fillStyle = "#537d3f";
    ctx.fillRect(x * TILE - 5, y * TILE - 11, 9, 4);
  }
  const tx = portal.x * TILE,
    ty = portal.y * TILE;
  ctx.fillStyle = "#223e32";
  ctx.fillRect(tx - 20, ty - 21, 40, 36);
  ctx.fillStyle = "#a8a776";
  ctx.fillRect(tx - 19, ty - 27, 38, 8);
  ctx.fillRect(tx - 21, ty - 19, 7, 31);
  ctx.fillRect(tx + 14, ty - 19, 7, 31);
  ctx.fillRect(tx - 15, ty - 34, 30, 8);
  // Stepped keystones and runes make the portal read as a structure, not a rectangle.
  ctx.fillStyle = "#d0c599";
  ctx.fillRect(tx - 10, ty - 35, 20, 4);
  ctx.fillStyle = "#667f65";
  for (let j = 0; j < 4; j++) {
    ctx.fillRect(tx - 22, ty - 18 + j * 8, 9, 2);
    ctx.fillRect(tx + 13, ty - 18 + j * 8, 9, 2);
  }
  ctx.fillStyle = "#648e57";
  ctx.fillRect(tx - 24, ty + 5, 12, 5);
  ctx.fillRect(tx + 11, ty - 25, 10, 5);
  ctx.fillStyle = "#e8cf73";
  s.beacons.forEach((v, i) => {
    if (v) ctx.fillRect(tx - 8 + i * 7, ty - 29, 3, 3);
  });
  ctx.fillStyle = s.beacons.every(Boolean) ? "#e9d975" : "#325b48";
  ctx.fillRect(tx - 12, ty - 19, 24, 29);
  if (s.beacons.every(Boolean)) {
    const glow = ctx.createRadialGradient(tx, ty - 3, 4, tx, ty - 3, 47);
    glow.addColorStop(0, "rgba(232,241,153,.45)");
    glow.addColorStop(1, "rgba(182,241,153,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(tx - 48, ty - 50, 96, 98);
    ctx.fillStyle = "#c0eab2";
    for (let j = 0; j < 4; j++)
      ctx.fillRect(
        tx - 8 + j * 5,
        ty - 14 + Math.sin(time * 0.002 + j) * 5,
        2,
        17,
      );
    for (let j = 0; j < 12; j++) {
      const angle = (j * Math.PI) / 6 + time * 0.00035;
      ctx.fillStyle = j % 2 ? "#fff0a4" : "#a7d58d";
      ctx.fillRect(
        Math.round(tx + Math.cos(angle) * 28),
        Math.round(ty - 5 + Math.sin(angle) * 30),
        2,
        2,
      );
    }
  }
  beacons.forEach((b, i) => {
    const bx = b.x * TILE,
      by = b.y * TILE;
    const near = !s.beacons[i] && Math.hypot(s.x - b.x, s.y - b.y) < 1.3;
    const age = Math.max(0, time - ignition[i]);
    if (s.beacons[i]) {
      const glow = ctx.createRadialGradient(bx, by - 12, 2, bx, by - 12, 30);
      glow.addColorStop(0, "rgba(255,224,114,.32)");
      glow.addColorStop(1, "rgba(255,224,114,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(bx - 30, by - 42, 60, 60);
      if (age < 1100) {
        ctx.strokeStyle = `rgba(246,223,126,${0.75 * (1 - age / 1100)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(bx, by + 7, 10 + age / 38, 5 + age / 76, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = "#fae49b";
      for (let j = 0; j < 3; j++)
        ctx.fillRect(
          bx - 7 + j * 7,
          by - 18 - ((time * 0.018 + j * 11) % 25),
          2,
          2,
        );
    }
    ctx.fillStyle = "#183a2e";
    ctx.fillRect(bx - 9, by + 5, 20, 7);
    ctx.fillStyle = "#7d8f6a";
    ctx.fillRect(bx - 8, by - 4, 16, 14);
    ctx.fillStyle = "#b8b58a";
    ctx.fillRect(bx - 10, by - 6, 20, 5);
    ctx.fillStyle = "#4d6654";
    ctx.fillRect(bx - 6, by - 27, 12, 20);
    ctx.fillStyle = "#bdb382";
    ctx.fillRect(bx - 8, by - 28, 16, 4);
    ctx.fillStyle = "#485c4a";
    ctx.fillRect(bx - 5, by - 21, 10, 6);
    ctx.fillStyle = "#c6bd85";
    ctx.fillRect(bx - 7, by - 22, 14, 3);
    ctx.fillStyle = s.beacons[i] ? "#eebb48" : "#536b5b";
    ctx.fillRect(bx - 4, by - 24, 8, 17);
    if (s.beacons[i]) {
      ctx.fillStyle = "#fff2a4";
      ctx.fillRect(bx - 2, by - 15, 4, 6);
      ctx.fillStyle = "rgba(255,212,86,.12)";
      ctx.fillRect(bx - 11, by - 24, 22, 26);
    }
    ctx.fillStyle = "#d9deae";
    ctx.font = "7px monospace";
    ctx.fillText(String(i + 1), bx - 2, by + 6);
    if (near) {
      ctx.fillStyle = "#faf0c5";
      ctx.fillRect(bx - 6, by - 36, 12, 10);
      ctx.fillStyle = "#173e33";
      ctx.font = "bold 8px monospace";
      ctx.fillText(touch ? "•" : "E", bx - 3, by - 28);
    }
  });
  // Tiny original amber robot sprite.
  const rx = Math.round(s.x * TILE),
    ry = Math.round(s.y * TILE);
  const step = active ? Math.sin(time * 0.014) * 1.5 : 0;
  ctx.fillStyle = "rgba(4,20,15,.4)";
  ctx.fillRect(rx - 8, ry + 7, 17, 4);
  ctx.fillStyle = "#7d4e20";
  ctx.fillRect(rx - 5, ry + 2, 4, 8 + step);
  ctx.fillRect(rx + 2, ry + 2, 4, 8 - step);
  ctx.fillStyle = "#db9b36";
  ctx.fillRect(rx - 5, ry - 4, 11, 10);
  ctx.fillRect(rx - 9, ry - 3, 3, 7);
  ctx.fillRect(rx + 7, ry - 3, 3, 7);
  ctx.fillStyle = "#f0ba47";
  ctx.fillRect(rx - 8, ry - 17, 17, 13);
  ctx.fillStyle = "#a77329";
  ctx.fillRect(rx + 7, ry - 16, 3, 12);
  ctx.fillStyle = "#1c3534";
  ctx.fillRect(rx - 5, ry - 13, 9, 6);
  ctx.fillStyle = "#f5e2a2";
  ctx.fillRect(rx - 3, ry - 12, 2, 3);
  ctx.fillRect(rx + 1, ry - 12, 2, 3);
  ctx.fillStyle = "#bb8733";
  ctx.fillRect(rx - 2, ry - 21, 3, 4);
  ctx.fillStyle = "#ffcf69";
  ctx.fillRect(rx - 3, ry - 23, 5, 3);
  // restrained canopy at top and edges
  for (let i = 0; i < 32; i++) {
    const x = (i * 47) % W,
      y = (i * 13) % 28;
    ctx.fillStyle = i % 2 ? "#15452f" : "#1d5133";
    ctx.fillRect(x, y, 20, 8);
    ctx.fillStyle = "#3d7042";
    ctx.fillRect(x + 5, y + 5, 9, 4);
  }
  if (s.won) {
    ctx.fillStyle = "rgba(9,37,30,.6)";
    ctx.fillRect(0, 0, W, H);
  }
}

// All worlds render in Canvas2D, independently of the collection's WebGL scene.
export function paintGame(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  time: number,
  active: boolean,
  touch = false,
) {
  if (s.id === "moss-signal") return paintMoss(ctx, s, time, active, touch);
  const W = COLS * TILE,
    H = ROWS * TILE,
    id = s.id;
  const palette: Record<string, string[]> = {
    "dusk-delivery": ["#211b36", "#393044", "#e89069", "#ffcf8d"],
    "orbit-zero": ["#080e25", "#15213c", "#88b9e8", "#e4edb0"],
    tidebound: ["#133f55", "#c7b68b", "#70c9cd", "#f3d993"],
    "ember-vault": ["#241724", "#594044", "#df7950", "#ffe0a1"],
    snowbyte: ["#29273f", "#b8cfdb", "#8b8fc8", "#ffe3a5"],
  };
  const [bg, floor, accent, light] = palette[id];
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const rect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  };
  const text = (value: string, x: number, y: number, color = light) => {
    ctx.fillStyle = color;
    ctx.font = "bold 9px monospace";
    ctx.fillText(value, x, y);
  };
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      const n = noise(x, y);
      const open = walkable(x + 0.5, y + 0.5, id);
      if (open && id !== "orbit-zero") {
        rect(x * TILE, y * TILE, TILE, TILE, floor);
        ctx.globalAlpha = 0.12;
        rect(x * TILE + 2, y * TILE + 3, 11, 1, n > 0.5 ? light : bg);
        ctx.globalAlpha = 1;
      } else if (id === "orbit-zero" && n > 0.67) {
        rect(
          x * TILE + n * 8,
          y * TILE + n * 9,
          n > 0.9 ? 2 : 1,
          n > 0.9 ? 2 : 1,
          n > 0.85 ? "#a9c6ea" : "#48566c",
        );
      } else if (!open && id === "snowbyte" && n > 0.5) {
        rect(x * TILE, y * TILE, 16, 10, "#55516c");
        rect(x * TILE + 3, y * TILE, 10, 3, "#d7e3df");
      } else if (!open && id === "ember-vault") {
        rect(x * TILE, y * TILE, 15, 14, n > 0.5 ? "#3d2933" : "#33232f");
        rect(x * TILE, y * TILE, 15, 2, "#604149");
      }
    }
  if (id === "dusk-delivery") {
    // Amber windows, rooftop tanks and street lamps give the crossings a city silhouette.
    for (const y of [8, 12]) {
      rect(32, y * TILE - 16, 384, 32, "#282b38");
      for (let x = 3; x < 26; x += 3)
        rect(x * TILE, y * TILE, 14, 1, "#837b70");
    }
    for (const y of [1, 18])
      for (let x = 2; x < 26; x += 3) {
        rect(x * TILE, y * TILE, 37, 24, "#39243c");
        rect(x * TILE + 5, y * TILE + 5, 5, 7, accent);
        rect(x * TILE + 22, y * TILE + 5, 5, 7, "#9a6457");
      }
    for (const y of [4, 15]) {
      rect(9 * TILE, y * TILE, 10 * TILE, 24, "#3f3048");
      for (let x = 10; x < 19; x += 2)
        rect(x * TILE, y * TILE + 3, 8, 6, "#bb795c");
    }
    for (const x of [4, 23])
      for (const y of [7, 11]) {
        rect(x * TILE - 1, y * TILE - 14, 2, 18, "#807b76");
        rect(x * TILE - 5, y * TILE - 15, 10, 3, light);
      }
  } else if (id === "orbit-zero") {
    ctx.strokeStyle = "#26395c";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(224, 160, 100, 70, -0.3, 0, Math.PI * 1.7);
    ctx.stroke();
    ctx.strokeStyle = "#55708a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(224, 160, 106, 76, -0.3, 0.3, Math.PI * 1.5);
    ctx.stroke();
    rect(193, 133, 62, 45, "#162f4e");
    rect(202, 140, 44, 34, "#244664");
    rect(210, 145, 25, 21, "#3d6a7d");
  } else if (id === "tidebound") {
    for (let j = 0; j < 40; j++) {
      const x = (j * 53 + Math.sin(time * 0.0006 + j) * 7) % W,
        y = (j * 31) % H;
      if (y < 135 || y > 185) rect(x, y, 15, 1, "#37778c");
    }
    for (let i = 0; i < 3; i++) {
      const high = tideHigh(s.elapsed, i),
        x = (6 + i * 7) * TILE;
      rect(x, 144, 40, 32, high ? "#3d9ab3" : "#8f9b8c");
      for (let j = 0; j < 3; j++)
        rect(x + 2, 148 + j * 10, 36, 2, high ? "#b0e1df" : "#cec5a1");
      rect(x + 10, 131, 20, 5, high ? "#f09d77" : "#c7e5a4");
    }
    for (const x of [3.5, 10.5, 17.5, 24.5]) {
      rect(x * TILE - 14, 176, 28, 8, "#6e8580");
      rect(x * TILE - 11, 183, 23, 4, "#436577");
    }
  } else if (id === "ember-vault") {
    for (let i = 0; i < 2; i++)
      for (const x of [2, 19]) {
        const y = (8 + i * 4) * TILE,
          on = fireOn(s.elapsed, i),
          width = (x === 2 ? 7 : 7) * TILE;
        rect(x * TILE, y - 7, width, 14, "#30212a");
        for (let j = 0; j < width; j += 12) {
          rect(x * TILE + j + 2, y - 5, 7, 10, "#b66c43");
          if (on) {
            rect(
              x * TILE + j + 3,
              y - 14 - Math.sin(time * 0.009 + j) * 3,
              5,
              22,
              "#e88b3c",
            );
            rect(x * TILE + j + 4, y - 8, 3, 12, "#ffdf86");
          }
        }
      }
    for (const x of [3, 25])
      for (const y of [3, 6, 14, 17]) {
        rect(x * TILE, y * TILE, 4, 9, "#c58749");
        rect(x * TILE - 2, y * TILE - 5, 8, 7, "#ffbd62");
      }
  } else if (id === "snowbyte") {
    ctx.strokeStyle = "#7c97ac";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(64, 256);
    ctx.lineTo(368, 256);
    ctx.lineTo(368, 160);
    ctx.lineTo(80, 160);
    ctx.lineTo(80, 64);
    ctx.lineTo(392, 64);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let j = 0; j < 28; j++)
      rect(
        (j * 73 + time * 0.005) % W,
        (j * 37 + time * 0.008) % H,
        2,
        2,
        "#edf4ed",
      );
  }
  // Destination silhouette. Its light is only on after all three objectives.
  const g = gameSpecs[id].goal,
    gx = g.x * TILE,
    gy = g.y * TILE,
    ready = s.beacons.every(Boolean);
  if (id === "tidebound") {
    rect(gx - 10, gy - 33, 20, 40, "#e9ddbe");
    rect(gx - 10, gy - 15, 20, 8, "#b95b53");
    rect(gx - 13, gy - 38, 26, 7, "#d26f59");
    rect(gx - 7, gy - 31, 14, 8, ready ? light : "#5e7d83");
  } else if (id === "snowbyte") {
    rect(gx - 17, gy - 20, 34, 30, "#61577b");
    rect(gx - 22, gy - 24, 44, 6, "#f3e8d9");
    rect(gx - 10, gy - 15, 20, 12, ready ? light : "#9ab6c7");
    rect(gx - 30, gy - 35, 60, 2, "#817995");
  } else {
    rect(gx - 17, gy - 19, 34, 30, id === "orbit-zero" ? "#60778c" : "#765a58");
    rect(gx - 12, gy - 15, 24, 22, ready ? light : bg);
    rect(gx - 20, gy + 10, 40, 3, accent);
  }
  gameSpecs[id].objectives.forEach((p, i) => {
    const x = p.x * TILE,
      y = p.y * TILE,
      done = s.beacons[i],
      near = distance(s, p) < 1.3;
    if (id === "dusk-delivery") {
      rect(x - 13, y - 18, 26, 25, "#7d5159");
      rect(x - 17, y - 22, 34, 5, accent);
      rect(x - 5, y - 10, 10, 16, done ? "#b5d399" : light);
    } else if (id === "orbit-zero") {
      rect(x - 5, y - 8, 10, 16, done ? "#385064" : light);
      rect(x - 9, y - 4, 4, 8, accent);
      rect(x + 5, y - 4, 4, 8, accent);
    } else if (id === "ember-vault" && i === 0) {
      rect(x - 5, y - 10, 10, 9, done ? "#715d50" : light);
      rect(x - 1, y - 2, 3, 13, done ? "#715d50" : light);
      rect(x + 1, y + 6, 5, 3, light);
    } else {
      rect(x - 1, y - 19, 2, 28, accent);
      rect(x + 1, y - 19, 13, 9, done ? "#b5d399" : light);
    }
    text(done ? "✓" : String(i + 1), x - 3, y - 26, done ? "#b5d399" : light);
    if (near && !done && ["dusk-delivery", "ember-vault"].includes(id)) {
      rect(x - 7, y - 42, 14, 12, light);
      text(touch ? "•" : "E", x - 3, y - 33, bg);
    }
  });
  hazards(s).forEach((h) => {
    const x = h.x * TILE,
      y = h.y * TILE;
    if (id === "dusk-delivery") {
      rect(x - 13, y - 6, 26, 12, "#b06773");
      rect(x - 7, y - 5, 10, 6, "#292f40");
      rect(x - 11, y + 6, 6, 3, "#171d2c");
      rect(x + 7, y + 6, 6, 3, "#171d2c");
      rect(x + 10, y - 4, 3, 3, light);
    } else if (id === "orbit-zero") {
      rect(x - 13, y - 9, 26, 18, "#756b72");
      rect(x - 8, y - 13, 16, 26, "#756b72");
      rect(x - 7, y - 7, 8, 7, "#a89a8b");
      rect(x + 4, y + 3, 7, 6, "#524d5e");
    } else {
      rect(x - 13, y - 6, 26, 12, "#456179");
      rect(x - 8, y - 3, 16, 7, "#243448");
    }
  });
  const x = Math.round(s.x * TILE),
    y = Math.round(s.y * TILE);
  if (s.cooldown <= 0 || Math.floor(time / 100) % 2 === 0) {
    if (id === "orbit-zero") {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(s.vy, s.vx) + Math.PI / 2);
      rect(-6, -9, 12, 17, "#d5dfdf");
      rect(-12, 0, 6, 11, accent);
      rect(6, 0, 6, 11, accent);
      rect(-3, -5, 6, 6, "#467898");
      if (active && Math.hypot(s.vx, s.vy) > 0.1)
        rect(-3, 9, 6, 7 + Math.sin(time * 0.03) * 3, "#f0c782");
      ctx.restore();
    } else {
      rect(x - 6, y + 6, 14, 4, "#243643");
      rect(x - 5, y - 6, 10, 13, id === "snowbyte" ? "#bb6978" : accent);
      rect(x - 6, y - 15, 12, 10, light);
      rect(x - 4, y - 11, 8, 3, bg);
      rect(x - 4, y + 6, 3, 5, light);
      rect(x + 2, y + 6, 3, 5, light);
      if (id === "dusk-delivery") rect(x - 10, y - 5, 5, 9, "#ddba82");
      if (id === "snowbyte") {
        rect(x - 8, y + 11, 7, 2, "#686080");
        rect(x + 1, y + 11, 7, 2, "#686080");
      }
    }
  }
  if (s.won) {
    ctx.fillStyle = "rgba(9,17,31,.45)";
    ctx.fillRect(0, 0, W, H);
  }
}
