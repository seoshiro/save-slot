import { freshGame, parseGame, type GameId, type GameState } from "./game.ts";

type GameStorage = Pick<Storage, "getItem" | "setItem">;
const copy = (game: GameState): GameState => ({
  ...game,
  beacons: [...game.beacons],
});

export function createGameStore(storage: () => GameStorage) {
  // Keep every cartridge for this page even if browser storage is blocked or full.
  const games = new Map<GameId, GameState>();
  let storageReadable = true;
  function getGame(id: GameId = "moss-signal"): GameState {
    const current = games.get(id);
    if (current) return copy(current);
    let serialized: string | null = null;
    try {
      const session = storage();
      serialized =
        session.getItem(`save-slot:${id}:v2`) ||
        (id === "moss-signal" ? session.getItem("save-slot:moss:v1") : null);
    } catch {
      storageReadable = false;
    }
    let game: GameState;
    try {
      game = parseGame(JSON.parse(serialized || "null"), id);
    } catch {
      game = freshGame(id);
    }
    games.set(id, copy(game));
    return game;
  }
  function saveGame(game: GameState) {
    games.set(game.id, copy(game));
    try {
      storage().setItem(`save-slot:${game.id}:v2`, JSON.stringify(game));
      return storageReadable;
    } catch {
      // The in-memory copy remains authoritative until this page closes.
      return false;
    }
  }
  return { getGame, saveGame };
}
