import { test } from "node:test";
import assert from "node:assert/strict";
import { createGameStore } from "../src/game-storage.ts";
import { freshGame, gameIds, gameSpecs, type GameId } from "../src/game.ts";

const key = (id: GameId) => `save-slot:${id}:v2`;
const progressed = (id: GameId) => ({
  ...freshGame(id),
  ...gameSpecs[id].objectives[0],
  beacons: [true, false, false],
  checkpoint: ["orbit-zero", "tidebound", "snowbyte"].includes(id) ? 0 : -1,
  elapsed: 12,
});
function session() {
  const items = new Map<string, string>();
  const storage = {
    getItem: (name: string) => items.get(name) ?? null,
    setItem: (name: string, value: string) => {
      items.set(name, value);
    },
  };
  return { items, storage };
}

test("normal session saves restore each cartridge after recreating the page store", () => {
  const { items, storage } = session();
  const first = createGameStore(() => storage);
  for (const id of gameIds) first.saveGame(progressed(id));
  const reloaded = createGameStore(() => storage);
  for (const id of gameIds) {
    assert.deepEqual(reloaded.getGame(id), progressed(id), id);
    assert.deepEqual(JSON.parse(items.get(key(id))!), progressed(id));
  }
});

test("a blocked sessionStorage getter keeps all cartridges while the page stays open", () => {
  const blocked = () => {
    throw new Error("SecurityError");
  };
  const page = createGameStore(blocked);
  for (const id of gameIds) {
    assert.deepEqual(page.getGame(id), freshGame(id));
    assert.equal(page.saveGame(progressed(id)), false);
  }
  for (const id of gameIds) assert.deepEqual(page.getGame(id), progressed(id));
  // Memory is page-scoped, not a new persistent save feature.
  assert.deepEqual(createGameStore(blocked).getGame(), freshGame());
});

test("failed reads do not discard current-page saves when changing cartridges", () => {
  const { storage, items } = session();
  storage.getItem = () => {
    throw new Error("SecurityError");
  };
  const page = createGameStore(() => storage);
  for (const id of gameIds) {
    assert.deepEqual(page.getGame(id), freshGame(id));
    assert.equal(page.saveGame(progressed(id)), false);
  }
  for (const id of gameIds) {
    assert.deepEqual(page.getGame(id), progressed(id));
    assert.ok(items.has(key(id)));
  }
});

test("failed writes never replace newer in-memory progress with a stale stored save", () => {
  const { storage, items } = session();
  for (const id of gameIds) items.set(key(id), JSON.stringify(freshGame(id)));
  storage.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  const page = createGameStore(() => storage);
  for (const id of gameIds) {
    assert.deepEqual(page.getGame(id), freshGame(id));
    page.saveGame(progressed(id));
  }
  for (const id of gameIds) assert.deepEqual(page.getGame(id), progressed(id));
});

test("a write failure after an earlier successful save still preserves newer progress", () => {
  const { storage } = session();
  const page = createGameStore(() => storage);
  assert.equal(page.saveGame(freshGame()), true);
  storage.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  assert.equal(page.saveGame(progressed("moss-signal")), false);
  assert.equal(page.saveGame(progressed("orbit-zero")), false);
  assert.deepEqual(page.getGame(), progressed("moss-signal"));
});

for (const fails of [false, true]) {
  test(`restart resets only its cartridge (${fails ? "blocked" : "normal"} writes)`, () => {
    const { storage } = session();
    if (fails)
      storage.setItem = () => {
        throw new Error("QuotaExceededError");
      };
    const page = createGameStore(() => storage);
    for (const id of gameIds) page.saveGame(progressed(id));
    page.saveGame(freshGame("tidebound"));
    for (const id of gameIds) {
      const expected = id === "tidebound" ? freshGame(id) : progressed(id);
      assert.deepEqual(page.getGame(id), expected, id);
      if (!fails)
        assert.deepEqual(createGameStore(() => storage).getGame(id), expected);
    }
  });
}

test("malformed, wrong-cartridge, and invalid saves recover without losing another cartridge", () => {
  for (const raw of [
    "{broken",
    JSON.stringify(progressed("orbit-zero")),
    JSON.stringify({ ...freshGame(), beacons: [true] }),
  ]) {
    const { storage, items } = session();
    items.set(key("moss-signal"), raw);
    items.set(key("snowbyte"), JSON.stringify(progressed("snowbyte")));
    const page = createGameStore(() => storage);
    assert.deepEqual(page.getGame(), freshGame());
    assert.deepEqual(page.getGame("snowbyte"), progressed("snowbyte"));
    assert.equal(page.saveGame(freshGame()), true);
  }
});

test("legacy Moss saves still load and current saves take priority", () => {
  const { storage, items } = session();
  items.set("save-slot:moss:v1", JSON.stringify(progressed("moss-signal")));
  assert.deepEqual(
    createGameStore(() => storage).getGame(),
    progressed("moss-signal"),
  );
  items.set(key("moss-signal"), JSON.stringify(freshGame()));
  assert.deepEqual(createGameStore(() => storage).getGame(), freshGame());
});

test("stored snapshots do not alias caller-owned objective arrays", () => {
  const { storage } = session();
  const page = createGameStore(() => storage);
  const original = progressed("moss-signal");
  page.saveGame(original);
  original.beacons[1] = true;
  const returned = page.getGame();
  returned.beacons[2] = true;
  assert.deepEqual(page.getGame(), progressed("moss-signal"));
});
