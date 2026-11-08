import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/press-start-2p/latin.css";
import "@fontsource/press-start-2p/cyrillic.css";
import "@fontsource-variable/golos-text";
import { SaveScene } from "./scene";
import { worlds, words, type Lang } from "./data";
import {
  freshGame,
  parseGame,
  advance,
  activate,
  paintGame,
  COLS,
  ROWS,
  TILE,
  type GameState,
  type GameId,
  status as gameStatus,
} from "./game";
import "./style.css";
import { BootIntro } from "./BootIntro";

const A = import.meta.env.BASE_URL + "media/";
const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* no storage should never block play */
  }
};
const getGame = (id: GameId = "moss-signal") => {
  try {
    return parseGame(
      JSON.parse(
        sessionStorage.getItem(`save-slot:${id}:v2`) ||
          (id === "moss-signal"
            ? sessionStorage.getItem("save-slot:moss:v1")
            : null) ||
          "null",
      ),
      id,
    );
  } catch {
    return freshGame(id);
  }
};
const saveGame = (g: GameState) => {
  try {
    sessionStorage.setItem(`save-slot:${g.id}:v2`, JSON.stringify(g));
  } catch {}
};
const sessionAvailable = () => {
  try {
    const k = "save-slot:storage-check";
    sessionStorage.setItem(k, "1");
    sessionStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
};
const gameKey = (e: KeyboardEvent) =>
  ["KeyW", "KeyA", "KeyS", "KeyD", "KeyE"].includes(e.code)
    ? e.code.slice(3).toLowerCase()
    : e.key.toLowerCase();
const chooseInitial = () => {
  const i = worlds.findIndex((w) => w.id === location.hash.slice(1));
  if (i >= 0) return i;
  const stored = read("save-slot:selected");
  const n = stored === null ? 2 : Number(stored);
  return Number.isInteger(n) && n >= 0 && n < 6 ? n : 2;
};
function Icon({
  name,
}: {
  name: "sound" | "mute" | "cart" | "arrow" | "pause" | "play" | "close";
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      {name === "mute" || name === "sound" ? (
        <>
          <path d="M3 9h4l5-4v14l-5-4H3z" />
          {name === "mute" ? (
            <path d="m17 9 5 6m0-6-5 6" />
          ) : (
            <>
              <path d="M16 8c3 2 3 6 0 8M19 5c6 4 6 10 0 14" />
            </>
          )}
        </>
      ) : name === "cart" ? (
        <>
          <path d="M3 6h18v13H3zM7 3h10v3M7 15h10" />
        </>
      ) : name === "pause" ? (
        <>
          <path d="M8 4v16M16 4v16" />
        </>
      ) : name === "play" ? (
        <path d="m8 4 11 8-11 8z" />
      ) : name === "close" ? (
        <path d="m5 5 14 14m0-14L5 19" />
      ) : (
        <path d="M3 12h18m-7-7 7 7-7 7" />
      )}
    </svg>
  );
}
function App() {
  const [lang, setLang] = useState<Lang>(() =>
    read("save-slot:lang") === "ru" ? "ru" : "en",
  );
  const [touchUI, setTouchUI] = useState(
    () => matchMedia("(max-width: 700px), (pointer: coarse)").matches,
  );
  const t = words[lang];
  const [selected, setSelected] = useState(chooseInitial);
  const w = worlds[selected];
  const nearCopy = w.instructions[lang];
  const [bootVisible, setBootVisible] = useState(true);
  const [sceneAssetsReady, setSceneAssetsReady] = useState(false);
  const heroEl = useRef<HTMLElement>(null);
  const mainEl = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(() =>
    worlds.some((w) => w.id === location.hash.slice(1)),
  );
  const [inserted, setInserted] = useState(false);
  const [returning, setReturning] = useState(false);
  const viewOpen = open || returning;
  const [settled, setSettled] = useState(0);
  const [backReady, setBackReady] = useState(false);
  const [about, setAbout] = useState(false);
  const [detail, setDetail] = useState(0);
  const [inspect, setInspect] = useState(false);
  const [sound, setSound] = useState(false);
  const [paused, setPaused] = useState(false);
  const [large, setLarge] = useState(false);
  const [restart, setRestart] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [error, setError] = useState("");
  const [forceLight, setForceLight] = useState(
    () => new URLSearchParams(location.search).get("webgl") === "0",
  );
  const [retry, setRetry] = useState(0);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const game = useRef<GameState>(getGame(w.id));
  const [gameUI, setGameUI] = useState(() => ({
    count: game.current.beacons.filter(Boolean).length,
    won: game.current.won,
  }));
  const [hint, setHint] = useState("");
  const [status, setStatus] = useState(gameStatus(game.current));
  const sceneEl = useRef<HTMLDivElement>(null);
  const closeRef = useRef<(fromPop?: boolean) => void>(() => {});
  const scene = useRef<SaveScene | null>(null);
  const source = useRef<HTMLCanvasElement>(document.createElement("canvas"));
  const visibleGame = useRef<HTMLCanvasElement>(null);
  const keys = useRef(new Set<string>());
  const audio = useRef<AudioContext | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const aboutRef = useRef<HTMLDialogElement>(null);
  const restartRef = useRef<HTMLDialogElement>(null);
  const gameRegion = useRef<HTMLDivElement>(null);
  const audioEnabled = useRef(false);
  const isGame = open && inserted && settled === 2;
  const light = forceLight || !!error;
  const closing = useRef(false);
  const [openingWait, setOpeningWait] = useState(false);
  const openIntent = useRef(false);
  const openRef = useRef<(prepared?: boolean) => void>(() => {});
  const queuedSelection = useRef<number | null>(null);
  const openAfterReturn = useRef(false);
  const [hasSessionStorage] = useState(sessionAvailable);
  const progressNotice = hasSessionStorage
    ? t.saved
    : lang === "en"
      ? "Browser storage is unavailable. Progress lasts while this page stays open."
      : "Хранилище браузера недоступно. Прогресс сохранится, пока эта страница открыта.";
  function tone(note = 440) {
    if (!audioEnabled.current) return;
    try {
      const a = audio.current ?? (audio.current = new AudioContext());
      void a.resume();
      const osc = a.createOscillator(),
        g = a.createGain();
      osc.type = "triangle";
      osc.frequency.value = note;
      g.gain.setValueAtTime(0, a.currentTime);
      g.gain.linearRampToValueAtTime(0.055, a.currentTime + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.35);
      osc.connect(g).connect(a.destination);
      osc.start();
      osc.stop(a.currentTime + 0.4);
    } catch {}
  }
  useEffect(() => {
    audioEnabled.current = sound;
  }, [sound]);
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const f = () => setReduced(q.matches);
    q.addEventListener("change", f);
    return () => q.removeEventListener("change", f);
  }, []);
  useEffect(() => {
    const q = matchMedia("(max-width: 700px), (pointer: coarse)");
    const f = () => setTouchUI(q.matches);
    q.addEventListener("change", f);
    return () => q.removeEventListener("change", f);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    write("save-slot:lang", lang);
    document.title = `SAVE SLOT — ${open ? w.title : lang === "en" ? "Six small worlds" : "Шесть маленьких миров"}`;
  }, [lang, w.title, open]);
  useEffect(() => {
    saveGame(game.current);
    game.current = getGame(w.id);
    setGameUI({
      count: game.current.beacons.filter(Boolean).length,
      won: game.current.won,
    });
    setHint("");
    setStatus(gameStatus(game.current));
    keys.current.clear();
  }, [selected]);
  // Three deliberate compositions share one measured visual stage and one timeline.
  const shelfMetrics = useRef({ actions: 76, picks: 36 });
  useLayoutEffect(() => {
    const hero = heroEl.current,
      host = mainEl.current;
    if (!hero || !host) return;
    const app = host.closest(".app")!;
    const measure = () => {
      const header = app
        .querySelector(".header")!
        .getBoundingClientRect().height;
      const footer = app
        .querySelector(".footer")!
        .getBoundingClientRect().height;
      const actions = app.querySelector(".shelf-actions");
      const picks = app.querySelector(".world-picks");
      if (actions)
        shelfMetrics.current.actions = actions.getBoundingClientRect().height;
      if (picks)
        shelfMetrics.current.picks = picks.getBoundingClientRect().height;
      const mobile = innerWidth <= 700;
      const back = host.querySelector(".backbar");
      const openTop = Math.max(
        mobile ? 52 : 64,
        (back?.getBoundingClientRect().height || 0) + 16,
      );
      const top = Math.ceil(
        hero.getBoundingClientRect().height + (mobile ? 8 : 12),
      );
      const reserve = Math.ceil(
        shelfMetrics.current.actions + shelfMetrics.current.picks + 32,
      );
      const available = innerHeight - header - footer;
      const shelfStage = Math.max(
        mobile ? 150 : 200,
        available - top - reserve,
      );
      const openStage = mobile
        ? Math.max(250, Math.min(310, (innerWidth - 32) * 0.8))
        : Math.max(360, Math.min(620, available - openTop - 24));
      const gameStage = mobile
        ? Math.max(
            260,
            Math.min(innerHeight < 740 ? 300 : 330, (innerWidth - 32) * 0.88),
          )
        : openStage;
      const panelWidth = mobile
        ? host.clientWidth
        : Math.max(280, Math.min(370, host.clientWidth * 0.29));
      const panelHeight =
        host.querySelector(".world-info")?.getBoundingClientRect().height || 0;
      const openTotal = mobile
        ? openTop + openStage + panelHeight + 24
        : Math.max(openTop + openStage + 24, panelHeight + 48);
      const gameTotal = mobile
        ? openTop + gameStage + panelHeight + 24
        : Math.max(openTop + gameStage + 24, panelHeight + 48);
      for (const [name, value] of Object.entries({
        "stage-open-top": openTop,
        "large-top": openTop + 8,
        "viewport-main": available,
        "shelf-top": top,
        "shelf-stage-height": shelfStage,
        "open-stage-height": openStage,
        "game-stage-height": gameStage,
        "shelf-reserve": reserve,
        "actions-height": shelfMetrics.current.actions,
        "panel-width": panelWidth,
        "panel-height": panelHeight,
        "visual-reserve": mobile ? 0 : panelWidth + 24,
        "shelf-total": top + shelfStage + reserve,
        "open-total": openTotal,
        "game-total": gameTotal,
      }))
        host.style.setProperty("--" + name, value + "px");
    };
    const observer = new ResizeObserver(measure);
    [
      hero,
      app.querySelector(".header"),
      app.querySelector(".footer"),
      host.querySelector(".shelf-actions"),
      host.querySelector(".world-picks"),
      host.querySelector(".backbar"),
      host.querySelector(".world-info"),
    ].forEach((el) => el && observer.observe(el));
    window.addEventListener("resize", measure);
    document.fonts.ready.then(measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [viewOpen, inserted, lang]);
  // View changes are deliberate navigation, not a continuation of an old scroll offset.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const raf = requestAnimationFrame(() =>
      window.scrollTo({ top: 0, left: 0, behavior: "instant" }),
    );
    return () => cancelAnimationFrame(raf);
  }, [open, inserted, large]);
  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => {
      history.scrollRestoration = previous;
    };
  }, []);
  useEffect(() => {
    source.current.width = COLS * TILE;
    source.current.height = ROWS * TILE;
    paintGame(source.current.getContext("2d")!, game.current, 0, false);
    if (forceLight) return;
    let s: SaveScene;
    try {
      s = new SaveScene(
        sceneEl.current!,
        {
          select: (i, source) =>
            source === "drag" ? selectRef.current(i) : pickRef.current(i),
          assetsReady: () => setSceneAssetsReady(true),
          settled: (x) => {
            setSettled(x);
            if (x === 0) {
              setReturning(false);
              setInserted(false);
              closing.current = false;
              requestAnimationFrame(() =>
                document
                  .querySelector<HTMLButtonElement>("[data-open-box]")
                  ?.focus({ preventScroll: true }),
              );
              if (queuedSelection.current !== null) {
                setSelected(queuedSelection.current);
                queuedSelection.current = null;
                if (openAfterReturn.current) {
                  openAfterReturn.current = false;
                  requestAnimationFrame(() => openRef.current(true));
                }
              }
            }
          },
          ready: () => {
            setModelReady(true);
            setError("");
            if (openIntent.current) {
              openIntent.current = false;
              setOpeningWait(false);
              openRef.current(true);
            }
          },
          error: (message) => {
            setError(message);
            if (openIntent.current) {
              openIntent.current = false;
              setOpeningWait(false);
              openRef.current(true);
            }
          },
          screenRect: (x, y, w, h) => {
            const el = gameRegion.current;
            if (el) {
              el.style.setProperty("--screen-x", x + "px");
              el.style.setProperty("--screen-y", y + "px");
              el.style.setProperty("--screen-w", w + "px");
              el.style.setProperty("--screen-h", h + "px");
            }
          },
          progress: (p) => {
            const host = sceneEl.current?.closest("main");
            const smooth = (a: number, b: number) => {
              const x = Math.max(0, Math.min(1, (p - a) / (b - a)));
              return x * x * (3 - 2 * x);
            };
            host?.style.setProperty("--scene-open", String(Math.min(1, p)));
            host?.style.setProperty("--scene-play", String(smooth(1, 2)));
            host?.style.setProperty(
              "--compose-open",
              String(smooth(0.18, 0.72)),
            );
            host?.style.setProperty(
              "--panel-reveal",
              String(smooth(0.74, 0.94)),
            );
            host?.style.setProperty(
              "--shelf-reveal",
              String(1 - smooth(0, 0.18)),
            );
            host?.style.setProperty(
              "--back-reveal",
              String(smooth(0.18, 0.32)),
            );
            host?.style.setProperty(
              "--back-visibility",
              p > 0.18 ? "visible" : "hidden",
            );
            setBackReady(p >= 0.32);
            if (host) host.dataset.sceneProgress = p.toFixed(4);
          },
        },
        source.current,
      );
      scene.current = s;
      s.setSelected(selected);
      s.setReduced(reduced);
      s.setLanguage(lang);
      if (open) {
        s.progress.value = inserted ? 2 : 1;
        s.setStage(inserted ? 2 : 1);
      }
      s.setGame(
        open && inserted && settled === 2,
        open && inserted && settled === 2,
      );
    } catch {
      setError("webgl");
      return;
    }
    return () => {
      s.dispose();
      scene.current = null;
    };
  }, [forceLight, retry]);
  useEffect(() => {
    scene.current?.setReduced(reduced);
  }, [reduced]);
  useEffect(() => {
    scene.current?.setLanguage(lang);
  }, [lang]);
  useEffect(() => {
    scene.current?.setSelected(selected);
    write("save-slot:selected", String(selected));
  }, [selected]);
  useEffect(() => {
    scene.current?.setStage(open ? (inserted ? 2 : 1) : 0);
    if (light) {
      setSettled(open ? (inserted ? 2 : 1) : 0);
      if (!open) {
        setReturning(false);
        closing.current = false;
      }
    }
  }, [open, inserted, light]);
  useEffect(() => {
    scene.current?.setInspect(inspect);
  }, [inspect]);
  useEffect(() => {
    scene.current?.setGame(
      isGame || (returning && inserted),
      open && inserted && settled === 2,
    );
    if (isGame) gameRegion.current?.focus({ preventScroll: true });
  }, [isGame, open, inserted, settled, returning, selected]);
  function select(i: number) {
    if (open) return;
    openIntent.current = false;
    setOpeningWait(false);
    const next = (i + 6) % 6;
    if (closing.current && !light) {
      queuedSelection.current = next;
      return;
    }
    setSelected(next);
    setDetail(0);
    tone(250 + next * 35);
  }
  const selectRef = useRef<(i: number) => void>(() => {});
  selectRef.current = select;
  const pickRef = useRef<(i: number) => void>(() => {});
  pickRef.current = (i) => {
    if (i === selected) {
      openBox();
    } else select(i);
  };
  function openBox(prepared = false) {
    if (open) return;
    if (closing.current && queuedSelection.current !== null) {
      openAfterReturn.current = true;
      return;
    }
    openAfterReturn.current = false;
    if (!prepared && !scene.current?.ready && !light) {
      openIntent.current = true;
      setOpeningWait(true);
      scene.current?.warmConsole();
      return;
    }
    closing.current = false;
    setReturning(false);
    queuedSelection.current = null;
    previousFocus.current = document.activeElement as HTMLElement;
    setOpen(true);
    setSettled(-1);
    setInserted(false);
    setPaused(false);
    setDetail(0);
    history.pushState(
      { saveSlot: true, index: selected },
      "",
      location.pathname + location.search + "#" + w.id,
    );
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>(".brand")
        ?.focus({ preventScroll: true }),
    );
    tone(330);
  }
  openRef.current = openBox;
  function closeBox(fromPop = false) {
    // Light mode can settle before history.back() delivers popstate. Closing an
    // already closed shelf must not put it back into an unsettled state.
    if (closing.current || (!open && !returning)) return;
    setReturning(!light);
    setSettled(-1);
    setAbout(false);
    setRestart(false);
    closing.current = true;
    setPaused(true);
    keys.current.clear();
    saveGame(game.current);
    setLarge(false);
    setOpen(false);
    setInspect(false);
    if (!fromPop) {
      if (history.state?.saveSlot) history.back();
      else history.replaceState(null, "", location.pathname + location.search);
    }
    tone(220);
  }
  closeRef.current = closeBox;
  useEffect(() => {
    const f = () => {
      const i = worlds.findIndex((w) => w.id === location.hash.slice(1));
      if (i >= 0) {
        setSelected(i);
        setOpen(true);
        setInserted(false);
      } else closeRef.current(true);
    };
    window.addEventListener("popstate", f);
    return () => window.removeEventListener("popstate", f);
  }, []);
  function insert() {
    if (inserted || (!modelReady && !light)) return;
    setSettled(-1);
    setInserted(true);
    setPaused(false);
    keys.current.clear();
    tone(523);
    requestAnimationFrame(() =>
      gameRegion.current?.focus({ preventScroll: true }),
    );
  }
  function act() {
    if (!isGame || paused || game.current.won) return;
    const result = activate(game.current);
    game.current = result.state;
    if (result.activated >= 0) {
      const count = result.state.beacons.filter(Boolean).length;
      setGameUI({ count, won: false });
      setHint(
        count === 3
          ? w.goal[lang]
          : lang === "en"
            ? "Objective complete."
            : "Цель выполнена.",
      );
      tone(440 + result.activated * 110);
      saveGame(game.current);
    } else setHint(w.instructions[lang]);
    scene.current?.updateGame();
  }
  const actRef = useRef(act);
  actRef.current = act;
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        bootVisible ||
        about ||
        restart ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        )
      )
        return;
      const k = gameKey(e);
      if (k === "escape") {
        e.preventDefault();
        if (large) {
          setLarge(false);
          setPaused(true);
          keys.current.clear();
          return;
        }
        if (isGame) {
          setPaused((v) => !v);
          keys.current.clear();
        } else if (open) closeBox();
        return;
      }
      if (isGame) {
        if (
          [
            "arrowup",
            "arrowdown",
            "arrowleft",
            "arrowright",
            "w",
            "a",
            "s",
            "d",
          ].includes(k)
        ) {
          e.preventDefault();
          keys.current.add(k);
        }
        if (k === "e" && !e.repeat) {
          e.preventDefault();
          actRef.current();
        }
      } else if (!open && !e.repeat) {
        if (k === "arrowleft") {
          e.preventDefault();
          select(selected - 1);
        }
        if (k === "arrowright") {
          e.preventDefault();
          select(selected + 1);
        }
        if (k === "enter" && e.target === document.body) openBox();
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(gameKey(e));
    const blur = () => {
      keys.current.clear();
      if (isGame) setPaused(true);
      saveGame(game.current);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    const visibility = () => {
      if (document.hidden) blur();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [isGame, open, selected, about, restart, large, bootVisible]);
  useEffect(() => {
    let raf = 0,
      last = 0,
      saved = 0;
    const paint = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      const k = keys.current;
      const dx =
          (k.has("arrowright") || k.has("d") ? 1 : 0) -
          (k.has("arrowleft") || k.has("a") ? 1 : 0),
        dy =
          (k.has("arrowdown") || k.has("s") ? 1 : 0) -
          (k.has("arrowup") || k.has("w") ? 1 : 0);
      if (isGame && !paused && !about && !restart) {
        const before = game.current.won;
        game.current = advance(game.current, dx, dy, dt);
        const count = game.current.beacons.filter(Boolean).length;
        setStatus(gameStatus(game.current));
        setGameUI((prev) =>
          prev.count === count && prev.won === game.current.won
            ? prev
            : { count, won: game.current.won },
        );
        if (!before && game.current.won) {
          setGameUI({ count: 3, won: true });
          setHint(w.winText[lang]);
          saveGame(game.current);
          tone(880);
        }
      }
      paintGame(
        source.current.getContext("2d")!,
        game.current,
        reduced ? 0 : now,
        !!(dx || dy) && !paused,
        touchUI,
      );
      if (visibleGame.current) {
        const c = visibleGame.current.getContext("2d")!;
        c.imageSmoothingEnabled = false;
        c.drawImage(source.current, 0, 0);
      }
      if (!light) scene.current?.updateGame();
      if (now - saved > 1000) {
        saveGame(game.current);
        saved = now;
      }
      if (
        !document.hidden &&
        isGame &&
        !paused &&
        !game.current.won &&
        !about &&
        !restart
      )
        raf = requestAnimationFrame(paint);
    };
    paint(performance.now());
    return () => cancelAnimationFrame(raf);
  }, [
    isGame,
    paused,
    large,
    about,
    restart,
    lang,
    gameUI.won,
    selected,
    light,
    reduced,
    touchUI,
  ]);
  useEffect(() => {
    if (about) aboutRef.current?.showModal();
    else if (aboutRef.current?.open) aboutRef.current.close();
  }, [about]);
  useEffect(() => {
    if (restart) restartRef.current?.showModal();
    else if (restartRef.current?.open) restartRef.current.close();
  }, [restart]);
  function showAbout() {
    previousFocus.current = document.activeElement as HTMLElement;
    setAbout(true);
    keys.current.clear();
    if (isGame) setPaused(true);
  }
  function endAbout() {
    setAbout(false);
    requestAnimationFrame(() =>
      previousFocus.current?.focus({ preventScroll: true }),
    );
  }
  function restartGame() {
    game.current = freshGame(w.id);
    saveGame(game.current);
    setGameUI({ count: 0, won: false });
    setHint("");
    setRestart(false);
    setStatus(gameStatus(game.current));
    setPaused(false);
    keys.current.clear();
    requestAnimationFrame(() =>
      gameRegion.current?.focus({ preventScroll: true }),
    );
  }
  const pad = (key: string, label: string, arrow: string) => (
    <button
      className={"pad pad-" + key}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        keys.current.add(key);
      }}
      onPointerUp={() => keys.current.delete(key)}
      onPointerCancel={() => keys.current.delete(key)}
      onLostPointerCapture={() => keys.current.delete(key)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          keys.current.add(key);
        }
      }}
      onKeyUp={() => keys.current.delete(key)}
      onBlur={() => keys.current.delete(key)}
    >
      {arrow}
    </button>
  );
  return (
    <>
      {bootVisible && (
        <BootIntro
          lang={lang}
          reduced={reduced}
          light={light}
          sceneReady={sceneAssetsReady}
          sceneError={error}
          retry={retry}
          onDone={() => setBootVisible(false)}
          onLight={() => setForceLight(true)}
          onRetry={() => {
            setError("");
            setSceneAssetsReady(false);
            setModelReady(false);
            setRetry((x) => x + 1);
          }}
        />
      )}
      <div
        inert={bootVisible}
        aria-hidden={bootVisible || undefined}
        className={
          "app " +
          (viewOpen ? "opened" : "shelved") +
          (returning ? " returning" : "") +
          (viewOpen && inserted ? " playing" : "") +
          (inserted ? " inserted" : "") +
          (light ? " light-mode" : "") +
          (large ? " large-mode" : "")
        }
        data-game={w.id}
        data-settled={settled}
        data-count={gameUI.count}
        data-stage={
          returning
            ? "returning"
            : open
              ? inserted
                ? "inserted"
                : "open"
              : "shelf"
        }
      >
        <a className="skip" href="#main">
          {lang === "en" ? "Skip to collection" : "К коллекции"}
        </a>
        <header className="header frame-rule">
          <button
            className="brand"
            onClick={() => {
              if (open) closeBox();
            }}
            aria-label={
              lang === "en" ? "SAVE SLOT home" : "SAVE SLOT — главная"
            }
          >
            <span className="brand-screen">
              <i />
            </span>
            <span>SAVE SLOT</span>
          </button>
          <nav aria-label={lang === "en" ? "Main navigation" : "Главное меню"}>
            <button onClick={() => open && closeBox()}>{t.collection}</button>
            <button onClick={showAbout}>{t.about}</button>
          </nav>
          <div className="header-tools">
            <button
              className="mobile-about"
              onClick={showAbout}
              aria-label={t.about}
              title={t.about}
            >
              i
            </button>
            <div
              className="languages"
              aria-label={lang === "en" ? "Language" : "Язык"}
            >
              <button
                lang="en"
                aria-pressed={lang === "en"}
                onClick={() => setLang("en")}
              >
                EN
              </button>
              <span>/</span>
              <button
                lang="ru"
                aria-pressed={lang === "ru"}
                onClick={() => setLang("ru")}
              >
                RU
              </button>
            </div>
            <button
              className="icon-button"
              aria-label={sound ? t.soundOn : t.soundOff}
              aria-pressed={sound}
              onClick={() => {
                audioEnabled.current = !sound;
                setSound(!sound);
                if (!sound) tone(440);
              }}
            >
              <Icon name={sound ? "sound" : "mute"} />
            </button>
          </div>
        </header>
        <main
          ref={mainEl}
          id="main"
          className="main"
          style={{ "--world-accent": w.accent } as React.CSSProperties}
        >
          <div className="landscape" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="spark s1" aria-hidden="true">
            +
          </div>
          <div className="spark s2" aria-hidden="true">
            +
          </div>
          <div className="spark s3" aria-hidden="true">
            +
          </div>
          <section className="hero-copy" ref={heroEl} aria-hidden={viewOpen}>
            <p className="eyebrow">{t.six}</p>
            <h1>
              {t.headline.split("\n").map((s, i) => (
                <React.Fragment key={s}>
                  {i > 0 && <br />}
                  {s}
                </React.Fragment>
              ))}
            </h1>
            <p className="intro">{t.intro}</p>
          </section>
          {viewOpen && (
            <div className="backbar" inert={!open || (!light && !backReady)}>
              <button onClick={() => closeBox()} className="back">
                <span>←</span>
                {t.back}
              </button>
              <span className="number">
                <b>{String(selected + 1).padStart(2, "0")}</b> / 06
              </span>
            </div>
          )}
          <div className="scene-wrap">
            <div className="scene-stage">
              <div
                className="scene"
                ref={sceneEl}
                role="img"
                aria-label={
                  lang === "en"
                    ? "Interactive collection of six game boxes"
                    : "Интерактивная коллекция шести игровых коробок"
                }
              />
              {light && (
                <div className={"fallback " + (open ? "fallback-open" : "")}>
                  {!open ? (
                    <div className="flat-shelf">
                      {worlds.map((v, i) => (
                        <button
                          key={v.id}
                          className={i === selected ? "flat-active" : ""}
                          onClick={() => pickRef.current(i)}
                          aria-label={v.title}
                        >
                          <img
                            src={A + v.cover + "-cover.webp"}
                            alt={v.title}
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flat-console">
                      <img src={A + "console-poster.webp"} alt="" />
                      <div className="flat-screen">
                        <img src={A + w.cover + "-world.webp"} alt={w.title} />
                      </div>
                      <img
                        className="flat-box"
                        src={A + w.cover + "-cover.webp"}
                        alt=""
                      />
                    </div>
                  )}
                </div>
              )}
              {isGame && (
                <div
                  ref={gameRegion}
                  role="group"
                  tabIndex={0}
                  className={
                    "game-region " + (large || light ? "canvas-visible" : "")
                  }
                  aria-label={
                    lang === "en"
                      ? w.title + " game. " + (touchUI ? nearCopy : t.controls)
                      : "Игра " +
                        w.title +
                        ". " +
                        (touchUI ? nearCopy : t.controls)
                  }
                  data-testid="game-region"
                >
                  <canvas
                    ref={visibleGame}
                    width={COLS * TILE}
                    height={ROWS * TILE}
                    aria-label={
                      lang === "en"
                        ? w.title + " game map"
                        : "Карта игры " + w.title
                    }
                    role="img"
                  />
                  {(paused || gameUI.won) && (
                    <div className="game-overlay">
                      <h3>{gameUI.won ? t.complete : t.paused}</h3>
                      <p>{gameUI.won ? w.winText[lang] : progressNotice}</p>
                      <button
                        className="primary"
                        onClick={() =>
                          gameUI.won ? setRestart(true) : setPaused(false)
                        }
                      >
                        {gameUI.won ? t.again : t.resume}
                      </button>
                      <button onClick={() => closeBox()}>{t.back}</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {light && (
              <p className="fallback-notice" role="status">
                <span>{error === "model" ? t.modelError : t.unavailable}</span>
                <button
                  onClick={() => {
                    setError("");
                    setForceLight(false);
                    setRetry((x) => x + 1);
                    setModelReady(false);
                  }}
                >
                  {t.retry}
                </button>
              </p>
            )}
          </div>
          {true && (
            <div
              className="shelf-actions"
              inert={viewOpen}
              aria-hidden={viewOpen}
            >
              <div className="selected-copy" aria-live="polite">
                <h2>
                  <span>{String(selected + 1).padStart(2, "0")}</span>
                  <small>/ 06 — </small>
                  {w.title}
                </h2>
                <p>{w.genre[lang]}</p>
              </div>
              <div className="browse">
                <button
                  className="square"
                  aria-label={t.prev}
                  onClick={() => select(selected - 1)}
                >
                  ←
                </button>
                <span>{t.browse}</span>
                <button
                  className="square"
                  aria-label={t.next}
                  onClick={() => select(selected + 1)}
                >
                  →
                </button>
              </div>
              <button
                className="primary open-button"
                data-open-box
                onClick={() => {
                  if (openingWait) {
                    openIntent.current = false;
                    setOpeningWait(false);
                  } else openBox();
                }}
                onPointerEnter={() => scene.current?.warmConsole()}
                onFocus={() => scene.current?.warmConsole()}
              >
                {openingWait ? (lang === "en" ? "CANCEL" : "ОТМЕНИТЬ") : t.open}
                <span>{openingWait ? "×" : "↗"}</span>
              </button>
              {openingWait && (
                <p className="preparing-console" role="status">
                  {t.loading}
                </p>
              )}
            </div>
          )}
          {true && (
            <div
              className="world-picks"
              role="group"
              aria-label={t.select}
              inert={viewOpen}
              aria-hidden={viewOpen}
            >
              {worlds.map((v, i) => (
                <button
                  key={v.id}
                  aria-pressed={i === selected}
                  onClick={() => select(i)}
                  title={v.title}
                  aria-label={v.title}
                >
                  <span>{v.number}</span>
                  <i style={{ background: v.accent }} />
                </button>
              ))}
            </div>
          )}
          {viewOpen && (
            <section
              inert={!open || settled < 1}
              className={"world-info " + (settled >= 1 ? "arrived" : "")}
              aria-labelledby="world-title"
            >
              <div className="world-heading">
                <p className="eyebrow">
                  SS—{w.number}
                  <span> / {w.genre[lang]}</span>
                </p>
                <h1 id="world-title" tabIndex={-1}>
                  {w.title}
                </h1>
                <p className="tagline">{w.tagline[lang]}</p>
                <span className="type-label">
                  {true ? (
                    <>
                      <i className="status-dot" />
                      {t.demo}
                    </>
                  ) : (
                    t.concept
                  )}
                </span>
              </div>
              {!inserted ? (
                <>
                  <button
                    className="primary insert-button"
                    disabled={!modelReady && !light}
                    onClick={insert}
                  >
                    {!modelReady && !light ? t.loading : t.insert}
                  </button>
                  <button
                    className="inspect-button"
                    aria-pressed={inspect}
                    onClick={() => setInspect(!inspect)}
                  >
                    {t.inspect}
                    <span>⟳</span>
                  </button>
                  {!modelReady && !light && (
                    <button
                      className="secondary"
                      onClick={() => setForceLight(true)}
                    >
                      {t.light}
                    </button>
                  )}
                  {true && (
                    <div className="instructions">
                      <div>
                        <span className="robot-icon" aria-hidden="true">
                          ▣
                        </span>
                        <b>{t.move}</b>
                      </div>
                      <div>
                        <span className="signal-icon" aria-hidden="true">
                          ✦
                        </span>
                        <b>{w.actionLabel[lang]}</b>
                      </div>
                      <div>
                        <span className="portal-icon" aria-hidden="true">
                          ∩
                        </span>
                        <b>{lang === "en" ? "FINISH" : "ФИНИШ"}</b>
                      </div>
                    </div>
                  )}
                  <button
                    className="world-detail-preview"
                    onClick={() => setDetail((detail + 1) % 3)}
                    aria-label={t.nextDetail}
                  >
                    <img src={A + w.cover + "-world.webp"} alt="" />
                    <span>
                      {t.notes[detail]} <i>↗</i>
                    </span>
                  </button>
                  <p className="world-description">
                    {detail === 0
                      ? w.description[lang]
                      : detail === 1
                        ? w.goal[lang]
                        : selected === 2
                          ? lang === "en"
                            ? "The game is drawn on a small canvas, connected to the console’s screen. The three beacons can each be activated once."
                            : "Игра рисуется на небольшом Canvas, связанном с экраном консоли. Каждый маяк включается только один раз."
                          : t.conceptNote}
                  </p>
                </>
              ) : true ? (
                <div className="game-controls">
                  <div className="game-stat" aria-live="polite">
                    <span>{w.objectiveLabel[lang]}</span>
                    <b>
                      {gameUI.count}
                      <small> / 3</small>
                    </b>
                  </div>
                  <p className="game-hint" role="status">
                    {status === "setback"
                      ? lang === "en"
                        ? "Back to safety. Your objectives are kept."
                        : "Снова в безопасном месте. Выполненные цели сохранены."
                      : status === "ready"
                        ? w.goal[lang]
                        : hint || nearCopy}
                  </p>
                  <div className="desktop-controls">
                    <p>
                      <kbd>↑</kbd>
                      <kbd>←</kbd>
                      <kbd>↓</kbd>
                      <kbd>→</kbd>
                      <span> / WASD</span>
                    </p>
                    <p>
                      <kbd>E</kbd>
                      <span>{w.actionLabel[lang]}</span>
                    </p>
                    <p>
                      <kbd>Esc</kbd>
                      <span>{t.pause}</span>
                    </p>
                  </div>
                  <div className="touch-controls">
                    <div className="dpad">
                      {pad("arrowup", lang === "en" ? "Move up" : "Вверх", "▲")}
                      {pad(
                        "arrowleft",
                        lang === "en" ? "Move left" : "Влево",
                        "◀",
                      )}
                      {pad(
                        "arrowright",
                        lang === "en" ? "Move right" : "Вправо",
                        "▶",
                      )}
                      {pad(
                        "arrowdown",
                        lang === "en" ? "Move down" : "Вниз",
                        "▼",
                      )}
                    </div>
                    <button
                      className="primary activate"
                      disabled={!isGame || paused || gameUI.won}
                      onClick={act}
                    >
                      {w.actionLabel[lang]}
                    </button>
                  </div>
                  <div className="game-actions">
                    <button
                      className="secondary"
                      onClick={() => {
                        setPaused((v) => !v);
                        keys.current.clear();
                      }}
                    >
                      <Icon name={paused ? "play" : "pause"} />
                      {paused ? t.resume : t.pause}
                    </button>
                    <button
                      className="secondary"
                      onClick={() => setLarge((v) => !v)}
                      disabled={!isGame}
                    >
                      {large ? t.shrink : t.fullscreen}
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setRestart(true)}
                    >
                      {t.again}
                    </button>
                  </div>
                  <p className="small-copy">{progressNotice}</p>
                </div>
              ) : (
                <div className="concept-info">
                  <span className="type-label">{t.worldView}</span>
                  <p>{w.description[lang]}</p>
                  <div
                    className="concept-tabs"
                    role="group"
                    aria-label={t.details}
                  >
                    {t.notes.map((v, i) => (
                      <button
                        key={i}
                        aria-pressed={detail === i}
                        onClick={() => setDetail(i)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <figure>
                    <img
                      src={A + w.cover + "-world.webp"}
                      className={"concept-art detail-" + detail}
                      alt={w.title + " — " + t.notes[detail]}
                    />
                    <figcaption>
                      {detail === 0
                        ? w.goal[lang]
                        : detail === 1
                          ? w.tagline[lang]
                          : t.conceptNote}
                    </figcaption>
                  </figure>
                  <p className="small-copy">{t.conceptNote}</p>
                </div>
              )}
            </section>
          )}
        </main>
        <footer className="footer frame-rule">
          <span>{t.footer}</span>
          <span className="footer-credit">
            {lang === "en" ? "Independent concept" : "Авторский концепт"} ·{" "}
            <a
              href="https://seoshiro.github.io/"
              target="_blank"
              rel="noreferrer"
            >
              Beibars Ileskhan ↗
            </a>
          </span>
          <button
            onClick={() => {
              audioEnabled.current = !sound;
              setSound(!sound);
              if (!sound) tone();
            }}
            aria-pressed={sound}
          >
            <Icon name={sound ? "sound" : "mute"} />
            {sound ? t.soundOn : t.soundOff}
          </button>
        </footer>
        <dialog
          ref={aboutRef}
          onCancel={(e) => {
            e.preventDefault();
            endAbout();
          }}
          className="about-dialog"
        >
          <button
            className="dialog-close icon-button"
            onClick={endAbout}
            aria-label={t.close}
          >
            <Icon name="close" />
          </button>
          <span className="eyebrow">
            {lang === "en" ? "SAVE SLOT / FIELD NOTES" : "SAVE SLOT / ЗАМЕТКИ"}
          </span>
          <h2>{t.aboutTitle}</h2>
          <p>{t.aboutCopy}</p>
          <p className="small-copy">
            {lang === "en"
              ? "The console source was generated with Meshy 7 Ultra through Higgsfield, then prepared in Blender. Box and cartridge parts, animation and game logic are built for the browser. No accounts, purchases or real game releases."
              : "Консоль создана через Meshy 7 Ultra в Higgsfield и подготовлена в Blender. Коробки, картриджи, анимация и игровая логика сделаны для браузера. Без аккаунтов, покупок и выдуманных релизов."}
          </p>
          <a
            className="primary"
            href="https://seoshiro.github.io/"
            target="_blank"
            rel="noreferrer"
          >
            {t.portfolio} ↗
          </a>
        </dialog>
        <dialog
          ref={restartRef}
          onCancel={(e) => {
            e.preventDefault();
            setRestart(false);
          }}
          className="restart-dialog"
        >
          <h2>{t.restartAsk}</h2>
          <div>
            <button className="primary" onClick={restartGame}>
              {t.yesRestart}
            </button>
            <button className="secondary" onClick={() => setRestart(false)}>
              {t.cancel}
            </button>
          </div>
        </dialog>
      </div>
    </>
  );
}
// Keep the HTML intro on screen until the non-render-blocking production CSS is
// usable. Its elapsed time still starts at navigation, not at React mount.
async function mount() {
  const styles = [
    ...document.querySelectorAll<HTMLLinkElement>("link[data-app-css]"),
  ];
  try {
    await Promise.all(
      styles.map(
        (link) =>
          new Promise<void>((resolve, reject) => {
            if (link.dataset.failed) return reject(new Error("stylesheet"));
            if (link.sheet || link.dataset.loaded) return resolve();
            link.addEventListener("load", () => resolve(), { once: true });
            link.addEventListener(
              "error",
              () => reject(new Error("stylesheet")),
              { once: true },
            );
          }),
      ),
    );
    createRoot(document.getElementById("root")!).render(<App />);
  } catch {
    const ru = read("save-slot:lang") === "ru";
    const status = document.querySelector(".boot-status");
    if (status)
      status.textContent = ru
        ? "Не удалось загрузить оформление коллекции. Попробуйте ещё раз."
        : "The collection styles could not load. Please try again.";
    const retry = document.createElement("button");
    retry.textContent = ru ? "Попробовать снова" : "Try again";
    retry.addEventListener("click", () => location.reload());
    document.querySelector(".boot-actions")?.append(retry);
  }
}
void mount();
