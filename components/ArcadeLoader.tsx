"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { wedding } from "@/data/wedding";
import { bindTheme, playTheme, pauseTheme, themeIsHeld } from "@/components/site-audio";

const LINES = [
  "ARGUING OVER A NUANCE",
  "FEEDING THE TORTOISE",
  "ON A RUN WITH YOGI",
  "`WORKING` FROM HOME",
];

const BOOT_MS = 3000;
const THEME_SRC = "/crocketttheme.mp3";

export function ArcadeLoader() {
  const pathname = usePathname();
  const skipBoot = pathname === "/admin" || pathname.startsWith("/admin/");
  const themeRef = useRef<HTMLAudioElement>(null);
  const [visible, setVisible] = useState(!skipBoot);
  const [line, setLine] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Start the theme with the page. If the browser blocks autoplay, the next tap starts it.
  useEffect(() => {
    const theme = themeRef.current;
    if (!theme) return;
    bindTheme(theme);

    let cancelled = false;

    const onPlay = () => {
      if (themeIsHeld()) {
        theme.pause();
        return;
      }
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);

    const resume = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".theme-toggle")) return;
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
      playTheme().catch(() => {});
    };

    theme.addEventListener("play", onPlay);
    theme.addEventListener("pause", onPause);

    theme.play().catch(() => {
      if (cancelled) return;
      window.addEventListener("pointerdown", resume);
      window.addEventListener("keydown", resume);
    });

    return () => {
      cancelled = true;
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
      theme.removeEventListener("play", onPlay);
      theme.removeEventListener("pause", onPause);
      theme.pause();
    };
  }, []);

  function toggleTheme() {
    const theme = themeRef.current;
    if (!theme) return;
    if (theme.paused) {
      playTheme().catch(() => {});
      return;
    }
    pauseTheme();
  }

  // The replies page opens straight onto the form. A later visit clears a boot that is still up.
  useEffect(() => {
    if (!skipBoot) return;
    setVisible(false);
    document.body.style.overflow = "";
  }, [skipBoot]);

  // Cover the first paint, then release the page. Reduced motion skips the wait.
  useEffect(() => {
    if (skipBoot) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const lineTimer = window.setInterval(() => {
      setLine((current) => (current + 1) % LINES.length);
    }, 620);

    const done = window.setTimeout(() => {
      window.clearInterval(lineTimer);
      document.body.style.overflow = previousOverflow;
      setVisible(false);
    }, reduce ? 400 : BOOT_MS);

    return () => {
      window.clearInterval(lineTimer);
      window.clearTimeout(done);
      document.body.style.overflow = previousOverflow;
    };
  }, [skipBoot]);

  return (
    <>
      <audio ref={themeRef} className="theme-audio" src={THEME_SRC} autoPlay preload="auto" />
      <button
        type="button"
        className="theme-toggle"
        aria-pressed={playing}
        aria-label={playing ? "Mute the theme" : "Play the theme"}
        onClick={toggleTheme}
      >
        {playing ? "Mute" : "Play"}
      </button>
      {visible ? (
        <div className="boot-screen" role="status" aria-live="polite" aria-label="Loading">
          <p className="monogram">
            {wedding.couple.first.slice(0, 1)} & {wedding.couple.second.slice(0, 1)}
          </p>
          <div className="boot-card">
            <img
              className="boot-portrait"
              src="/Maisieandaidan.png"
              alt={`${wedding.couple.first} and ${wedding.couple.second}`}
              width={800}
              height={711}
            />
            <p className="boot-title">
              <span>{wedding.couple.first}</span>
              <span className="boot-amp">&</span>
              <span>{wedding.couple.second}</span>
            </p>
            <p className="boot-line">{LINES[line]}</p>
            <div className="boot-bar" aria-hidden="true">
              <span />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
