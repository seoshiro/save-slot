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
          Math.abs(x - 13) < 2 ||
          Math.abs(y - 10) < 2 ||
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
          ctx.fillRect(px, py, 16, 1);
          ctx.fillRect(px, py, 1, 16);
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
  ctx.fillStyle = s.beacons.every(Boolean) ? "#e9d975" : "#325b48";
  ctx.fillRect(tx - 12, ty - 19, 24, 29);
  if (s.beacons.every(Boolean)) {
    ctx.fillStyle = "#c0eab2";
    for (let j = 0; j < 4; j++)
      ctx.fillRect(
        tx - 8 + j * 5,
        ty - 14 + Math.sin(time * 0.002 + j) * 5,
        2,
        17,
      );
  }
  beacons.forEach((b, i) => {
    const bx = b.x * TILE,
      by = b.y * TILE;
    ctx.fillStyle = "#183a2e";
    ctx.fillRect(bx - 9, by + 5, 20, 7);
    ctx.fillStyle = "#7d8f6a";
    ctx.fillRect(bx - 8, by - 4, 16, 14);
    ctx.fillStyle = "#b8b58a";
    ctx.fillRect(bx - 10, by - 6, 20, 5);
    ctx.fillStyle = s.beacons[i] ? "#eebb48" : "#536b5b";
    ctx.fillRect(bx - 4, by - 16, 8, 10);
    if (s.beacons[i]) {
      ctx.fillStyle = "#fff2a4";
      ctx.fillRect(bx - 2, by - 15, 4, 6);
      ctx.fillStyle = "rgba(255,212,86,.12)";
      ctx.fillRect(bx - 11, by - 24, 22, 26);
    }
    ctx.fillStyle = "#d9deae";
    ctx.font = "7px monospace";
    ctx.fillText(String(i + 1), bx - 2, by + 6);
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
