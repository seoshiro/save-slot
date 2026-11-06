export const COLS = 28,
  ROWS = 20,
  TILE = 16;
export type GameState = {
  x: number;
  y: number;
  beacons: boolean[];
  won: boolean;
  elapsed: number;
};
export const beacons = [
  { x: 5.5, y: 5.5 },
  { x: 22.5, y: 5.5 },
  { x: 22.5, y: 15.5 },
];
export const portal = { x: 14.5, y: 3.5 };
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
export const freshGame = (): GameState => ({
  x: 5.5,
  y: 16.5,
  beacons: [false, false, false],
  won: false,
  elapsed: 0,
});
export function walkable(x: number, y: number) {
  return (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    grid[Math.floor(y)]?.[Math.floor(x)] === "."
  );
}
function canMove(x: number, y: number) {
  return [-0.23, 0.23].every((dx) =>
    [-0.23, 0.23].every((dy) => walkable(x + dx, y + dy)),
  );
}
export function advance(
  state: GameState,
  dx: number,
  dy: number,
  seconds: number,
): GameState {
  if (state.won || !Number.isFinite(seconds) || seconds <= 0) return state;
  let s = { ...state, elapsed: state.elapsed + Math.min(seconds, 0.05) };
  const n = Math.hypot(dx, dy);
  if (n) {
    dx /= n;
    dy /= n;
    const d = 2.4 * Math.min(seconds, 0.05);
    if (canMove(s.x + dx * d, s.y)) s.x += dx * d;
    if (canMove(s.x, s.y + dy * d)) s.y += dy * d;
  }
  if (
    s.beacons.every(Boolean) &&
    Math.hypot(s.x - portal.x, s.y - portal.y) < 0.85
  )
    s.won = true;
  return s;
}
export function activate(state: GameState): {
  state: GameState;
  activated: number;
} {
  const i = beacons.findIndex(
    (b, i) =>
      !state.beacons[i] && Math.hypot(state.x - b.x, state.y - b.y) < 1.3,
  );
  if (i < 0 || state.won) return { state, activated: -1 };
  return {
    state: { ...state, beacons: state.beacons.map((v, j) => j === i || v) },
    activated: i,
  };
}
export function parseGame(raw: unknown): GameState {
  if (!raw || typeof raw !== "object") return freshGame();
  const s = raw as GameState;
  if (
    !canMove(s.x, s.y) ||
    !Array.isArray(s.beacons) ||
    s.beacons.length !== 3 ||
    s.beacons.some((v) => typeof v !== "boolean") ||
    !Number.isFinite(s.elapsed) ||
    s.elapsed < 0 ||
    typeof s.won !== "boolean" ||
    (s.won && !s.beacons.every(Boolean))
  )
    return freshGame();
  return {
    x: s.x,
    y: s.y,
    beacons: [...s.beacons],
    won: s.won,
    elapsed: Math.min(s.elapsed, 86400),
  };
}
const noise = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
const ignition = [-1e6, -1e6, -1e6];
let previousSignals = 0;
export function paintGame(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  time: number,
  active: boolean,
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
      ctx.fillText("E", bx - 3, by - 28);
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
