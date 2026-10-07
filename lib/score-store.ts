import "server-only";

import { readFile, rename, writeFile } from "fs/promises";
import path from "path";

import { TOKEN_PATTERN } from "@/lib/guest-store";

type ScoreRow = {
  token: string;
  hits: number;
  updatedAt: string;
  // Times of recent hits, used only to ignore a scripted flood.
  recent: number[];
};

type Store = {
  scores: ScoreRow[];
};

const filePath = path.join(process.cwd(), "data", "scores.json");

// A person can pop the few stickers on screen. A tight loop cannot.
const WINDOW_MS = 10_000;
const MAX_HITS_IN_WINDOW = 20;

// Writes are queued so two pops cannot overwrite each other.
let chain: Promise<void> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function isRow(value: unknown): value is ScoreRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<ScoreRow>;
  if (typeof row.token !== "string" || !TOKEN_PATTERN.test(row.token)) return false;
  if (typeof row.hits !== "number" || !Number.isInteger(row.hits) || row.hits < 0) return false;
  if (typeof row.updatedAt !== "string") return false;
  if (!Array.isArray(row.recent) || row.recent.some((time) => typeof time !== "number")) return false;
  return true;
}

async function writeStore(store: Store): Promise<void> {
  const temporary = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(temporary, filePath);
}

async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Store;
    if (!parsed || !Array.isArray(parsed.scores) || !parsed.scores.every(isRow)) {
      throw new Error("Scores are unreadable.");
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { scores: [] };
    }
    throw error;
  }
}

export type StoredScore = {
  token: string;
  hits: number;
  updatedAt: string;
};

export function listScores(): Promise<StoredScore[]> {
  return enqueue(async () => {
    const store = await readStore();
    return store.scores.map((row) => ({
      token: row.token,
      hits: row.hits,
      updatedAt: row.updatedAt,
    }));
  });
}

// Adds one hit for a household that the caller has already checked exists.
export function incrementScore(token: string): Promise<{ hits: number; counted: boolean }> {
  return enqueue(async () => {
    const store = await readStore();
    const now = Date.now();
    let row = store.scores.find((score) => score.token === token);
    if (!row) {
      row = { token, hits: 0, updatedAt: new Date(now).toISOString(), recent: [] };
      store.scores.push(row);
    }

    row.recent = row.recent.filter((time) => now - time < WINDOW_MS);
    if (row.recent.length >= MAX_HITS_IN_WINDOW) {
      return { hits: row.hits, counted: false };
    }

    row.hits += 1;
    row.updatedAt = new Date(now).toISOString();
    row.recent.push(now);
    await writeStore(store);
    return { hits: row.hits, counted: true };
  });
}
