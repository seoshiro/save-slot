import { useEffect, useRef, useState } from "react";
import { worlds, type Lang } from "./data";

export function BootIntro({
  lang,
  reduced,
  light,
  sceneReady,
  sceneError,
  retry,
  onRetry,
  onLight,
  onDone,
}: {
  lang: Lang;
  reduced: boolean;
  light: boolean;
  sceneReady: boolean;
  sceneError: string;
  retry: number;
  onRetry: () => void;
  onLight: () => void;
  onDone: () => void;
}) {
  const started = useRef(performance.now());
  const [loaded, setLoaded] = useState(0);
  const [fonts, setFonts] = useState(false);
  const [failed, setFailed] = useState(false);
  const [slow, setSlow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);
  const ru = lang === "ru";
  const total = worlds.length * 2 + 1;
  const ready = loaded === total && fonts && (light || sceneReady);
  useEffect(() => {
    let alive = true;
    setLoaded(0);
    setFailed(false);
    setSlow(false);
    const timer = window.setTimeout(() => alive && setSlow(true), 12000);
    const urls = worlds
      .flatMap((w) => [w.cover + "-cover.webp", w.cover + "-world.webp"])
      .concat("console-poster.webp");
    urls.forEach((file) => {
      const image = new Image();
      image.src = import.meta.env.BASE_URL + "media/" + file;
      image
        .decode()
        .then(() => alive && setLoaded((n) => n + 1))
        .catch(() => alive && setFailed(true));
    });
    Promise.all([
      document.fonts.load('16px "Press Start 2P"', "SAVE SLOT ВЫБЕРИ МИР"),
      document.fonts.load(
        '16px "Golos Text Variable"',
        "Six worlds Шесть миров",
      ),
      document.fonts.ready,
    ])
      .then(() => alive && setFonts(true))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [retry]);
  function finish() {
    if (!ready || done.current) return;
    done.current = true;
    setLeaving(true);
    window.setTimeout(onDone, reduced ? 30 : 500);
  }
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(
      finish,
      reduced ? 0 : Math.max(0, 3000 - (performance.now() - started.current)),
    );
    return () => clearTimeout(timer);
  }, [ready, reduced]);
  const completed = loaded + Number(fonts) + Number(light || sceneReady);
  return (
    <section
      className={`boot-intro${ready ? " is-ready" : ""}${leaving ? " is-leaving" : ""}${fonts ? " fonts-ready" : ""}`}
      aria-label={ru ? "Загрузка SAVE SLOT" : "Loading SAVE SLOT"}
      data-testid="boot-intro"
      data-ready={ready}
    >
      <div className="boot-art" aria-hidden="true">
        <span className="boot-kicker">SIX SMALL WORLDS</span>
        <h1>SAVE SLOT</h1>
        <div className="boot-machine">
          <div className="boot-cartridge">
            <i />
            <span>SS—06</span>
          </div>
          <div className="boot-slot">
            <span />
          </div>
          <div className="boot-led" />
        </div>
      </div>
      <div className="boot-bottom">
        <p className="boot-status" role="status">
          {failed
            ? ru
              ? "Не все материалы загрузились. Попробуйте ещё раз."
              : "Some artwork could not load. Please try again."
            : ready
              ? ru
                ? "Шесть миров готовы. Выберите свой."
                : "Six worlds are ready. Make room for yours."
              : slow
                ? ru
                  ? "Загрузка занимает больше времени. Уже готовые материалы сохранены."
                  : "Loading is taking longer. Prepared artwork is kept ready."
                : ru
                  ? "Готовим вашу коллекцию"
                  : "Preparing your collection"}
        </p>
        <div
          className="boot-segments"
          role="progressbar"
          aria-label={ru ? "Подготовленные ресурсы" : "Prepared resources"}
          aria-valuemin={0}
          aria-valuemax={total + 2}
          aria-valuenow={completed}
          aria-valuetext={`${loaded}/${total} ${ru ? "изображений" : "images"}; ${fonts ? "fonts ready" : "loading fonts"}; ${light ? "light view" : sceneReady ? "3D ready" : "preparing 3D"}`}
        >
          {Array.from({ length: total + 2 }, (_, i) => (
            <span key={i} className={i < completed ? "complete" : ""} />
          ))}
        </div>
        <p className="boot-detail">
          {ready
            ? ru
              ? "Короткое вступление можно пропустить"
              : "You can skip this short introduction"
            : `${loaded} / ${total} ${ru ? "изображений" : "images"} · ${!fonts ? (ru ? "шрифты" : "fonts") : light ? (ru ? "лёгкий режим" : "light view") : sceneReady ? "3D ✓" : ru ? "подготовка 3D" : "preparing 3D"}`}
        </p>
        <div className="boot-actions">
          {ready && (
            <button onClick={finish} className="text-button">
              {ru ? "К коллекции →" : "Skip intro →"}
            </button>
          )}
          {(failed || slow) && (
            <button onClick={onRetry} className="secondary">
              {ru ? "Повторить загрузку" : "Retry loading"}
            </button>
          )}
          {(slow || !!sceneError) && !light && (
            <button onClick={onLight} className="secondary">
              {ru ? "Открыть без 3D" : "Continue without 3D"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
