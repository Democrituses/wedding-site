import "server-only";

import { withDb } from "@/lib/db";

// A person can pop the few stickers on screen. A tight loop cannot.
const WINDOW_MS = 10_000;
const MAX_HITS_IN_WINDOW = 20;

type ScoreRow = {
  token: string;
  hits: number;
  updated_at: Date;
  recent: Array<number | string>;
};

export type StoredScore = {
  token: string;
  hits: number;
  updatedAt: string;
};

function recentTimes(value: Array<number | string>, now: number): number[] {
  return value
    .map((time) => (typeof time === "number" ? time : Number(time)))
    .filter((time) => Number.isFinite(time) && now - time < WINDOW_MS);
}

export function listScores(): Promise<StoredScore[]> {
  return withDb(async (tx) => {
    const rows = await tx<Array<Pick<ScoreRow, "token" | "hits" | "updated_at">>>`
      SELECT token, hits, updated_at
      FROM scores
      ORDER BY token
    `;
    return rows.map((row) => ({
      token: row.token,
      hits: row.hits,
      updatedAt: row.updated_at.toISOString(),
    }));
  });
}

// Adds one hit for a household that the caller has already checked exists.
export function incrementScore(token: string): Promise<{ hits: number; counted: boolean }> {
  return withDb(async (tx) => {
    const now = Date.now();
    await tx`SELECT pg_advisory_xact_lock(hashtext(${`score:${token}`}))`;

    const rows = await tx<ScoreRow[]>`
      SELECT token, hits, updated_at, recent
      FROM scores
      WHERE token = ${token}
      FOR UPDATE
    `;
    const row = rows[0];
    const recent = row ? recentTimes(row.recent, now) : [];
    if (recent.length >= MAX_HITS_IN_WINDOW) {
      return { hits: row?.hits ?? 0, counted: false };
    }

    const hits = (row?.hits ?? 0) + 1;
    const updatedAt = new Date(now);
    const times = [...recent, now];
    if (!row) {
      await tx`
        INSERT INTO scores (token, hits, updated_at, recent)
        VALUES (${token}, ${hits}, ${updatedAt}, ${times}::bigint[])
      `;
    } else {
      await tx`
        UPDATE scores
        SET hits = ${hits}, updated_at = ${updatedAt}, recent = ${times}::bigint[]
        WHERE token = ${token}
      `;
    }
    return { hits, counted: true };
  });
}
