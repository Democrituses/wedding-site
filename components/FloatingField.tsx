"use client";

import { Fragment, useEffect, useRef, useState, type AnimationEvent } from "react";

import { useRecordHit } from "@/components/ScoreProvider";
import { playHitmarker } from "@/components/site-audio";

const MEAN_GAP_MS = 15_000;

type Floater = {
  id: number;
  src: string;
  left: string;
  drift: string;
  duration: number;
  hit: boolean;
  top?: number;
  frozenLeft?: number;
  hitX?: number;
  hitY?: number;
};

// Exponential gaps average MEAN_GAP_MS. A uniform roll would cluster differently.
function nextGap() {
  return -MEAN_GAP_MS * Math.log(1 - Math.random());
}

export function FloatingField({ images }: { images: string[] }) {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const nextId = useRef(1);
  const popped = useRef(new Set<number>());
  const recordHit = useRecordHit();

  useEffect(() => {
    if (images.length === 0) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let cancelled = false;
    let timer = 0;

    const spawn = () => {
      const src = images[Math.floor(Math.random() * images.length)];
      const id = nextId.current;
      nextId.current += 1;
      const floater: Floater = {
        id,
        src,
        left: `${8 + Math.random() * 68}%`,
        drift: `${Math.round((Math.random() - 0.5) * 80)}px`,
        duration: 11000 + Math.random() * 7000,
        hit: false,
      };
      setFloaters((current) => [...current, floater]);
    };

    const schedule = () => {
      timer = window.setTimeout(() => {
        if (cancelled) return;
        spawn();
        schedule();
      }, nextGap());
    };

    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [images]);

  function removeFloater(id: number) {
    setFloaters((current) => current.filter((floater) => floater.id !== id));
  }

  function popFloater(id: number, element: HTMLButtonElement, hitX: number, hitY: number) {
    // One point for the first click. A second click on the fading sticker does not count.
    if (popped.current.has(id)) return;
    popped.current.add(id);
    const box = element.getBoundingClientRect();
    playHitmarker();
    recordHit?.();
    setFloaters((current) =>
      current.map((floater) =>
        floater.id === id
          ? { ...floater, hit: true, top: box.top, frozenLeft: box.left, hitX, hitY }
          : floater,
      ),
    );
  }

  function onAnimationEnd(id: number, event: AnimationEvent<HTMLButtonElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.animationName === "float-down" || event.animationName === "dissipate") {
      removeFloater(id);
    }
  }

  return (
    <div className="floating-field">
      {floaters.map((floater) => (
        <Fragment key={floater.id}>
          <button
            type="button"
            className={floater.hit ? "floater is-hit" : "floater"}
            style={
              floater.hit
                ? { top: floater.top, left: floater.frozenLeft }
                : {
                    left: floater.left,
                    animationDuration: `${floater.duration}ms`,
                    ["--drift" as string]: floater.drift,
                  }
            }
            aria-label="Pop"
            onClick={(event) => popFloater(floater.id, event.currentTarget, event.clientX, event.clientY)}
            onAnimationEnd={(event) => onAnimationEnd(floater.id, event)}
          >
            {/* Decorative sticker. The button name is the accessible label. */}
            <img src={floater.src} alt="" draggable={false} />
          </button>
          {/* The cross stays outside the sticker so the pop blur does not smear it. */}
          {floater.hit ? (
            <span className="floater-hit" style={{ left: floater.hitX, top: floater.hitY }} aria-hidden="true">
              <svg viewBox="0 0 100 100">
                <path d="M16 16 L38 38" />
                <path d="M84 16 L62 38" />
                <path d="M16 84 L38 62" />
                <path d="M84 84 L62 62" />
              </svg>
            </span>
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
