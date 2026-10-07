"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type ScorePlace = {
  name: string;
  hits: number;
  yours: boolean;
};

type ScoreBoard = {
  you: number;
  top: ScorePlace[];
};

const ScoreContext = createContext<(() => void) | null>(null);

const INVITE_PATH = /^\/i\/([a-z0-9]{6,32})$/;
const REFRESH_MS = 30_000;

export function useRecordHit(): (() => void) | null {
  return useContext(ScoreContext);
}

function Scoreboard({ board }: { board: ScoreBoard }) {
  const onBoard = board.top.some((place) => place.yours);

  return (
    <aside className="scoreboard" aria-label="High scores">
      <p className="scoreboard-title">High scores</p>
      {board.top.length === 0 ? (
        <p className="scoreboard-empty">Pop a picture</p>
      ) : (
        <ol>
          {board.top.map((place, index) => (
            <li key={`${place.name}-${index}`} className={place.yours ? "is-you" : undefined}>
              <span>{index + 1}</span>
              <span className="scoreboard-name">{place.name}</span>
              <span>{place.hits}</span>
            </li>
          ))}
        </ol>
      )}
      {!onBoard && board.you > 0 ? <p className="scoreboard-you">You {board.you}</p> : null}
    </aside>
  );
}

export function ScoreProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const token = INVITE_PATH.exec(pathname)?.[1] ?? null;
  const [board, setBoard] = useState<ScoreBoard | null>(null);

  const applyBoard = useCallback((next: ScoreBoard) => {
    setBoard((current) => {
      if (current && next.you < current.you) return current;
      return next;
    });
  }, []);

  useEffect(() => {
    if (!token) {
      setBoard(null);
      return;
    }

    let cancelled = false;
    const load = () => {
      void fetch(`/api/score?token=${token}`, { cache: "no-store" })
        .then(async (response) => {
          if (!response.ok || cancelled) return;
          applyBoard((await response.json()) as ScoreBoard);
        })
        .catch(() => undefined);
    };

    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token, applyBoard]);

  // The picture click plays immediately. The score catches up when this returns.
  const recordHit = useCallback(() => {
    if (!token) return;
    void fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        if (!response.ok) return;
        applyBoard((await response.json()) as ScoreBoard);
      })
      .catch(() => undefined);
  }, [token, applyBoard]);

  return (
    <ScoreContext.Provider value={token ? recordHit : null}>
      {children}
      {token && board ? <Scoreboard board={board} /> : null}
    </ScoreContext.Provider>
  );
}
