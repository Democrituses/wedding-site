import "server-only";

import { readFile, rename, writeFile } from "fs/promises";
import path from "path";

import type { Rsvp } from "@/lib/types";

type Store = {
  replies: Rsvp[];
};

const filePath = path.join(process.cwd(), "data", "rsvps.json");

// Writes are queued so two replies cannot overwrite each other.
let chain: Promise<void> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Store;
    if (!parsed || !Array.isArray(parsed.replies)) return { replies: [] };
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { replies: [] };
    }
    throw error;
  }
}

async function writeStore(store: Store): Promise<void> {
  const temporary = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(temporary, filePath);
}

export function getRsvp(token: string): Promise<Rsvp | null> {
  return enqueue(async () => {
    const store = await readStore();
    return store.replies.find((reply) => reply.token === token) ?? null;
  });
}

export function listRsvps(): Promise<Rsvp[]> {
  return enqueue(async () => {
    const store = await readStore();
    return store.replies;
  });
}

export function saveRsvp(rsvp: Rsvp): Promise<void> {
  return enqueue(async () => {
    const store = await readStore();
    const index = store.replies.findIndex((reply) => reply.token === rsvp.token);
    if (index === -1) store.replies.push(rsvp);
    else store.replies[index] = rsvp;
    await writeStore(store);
  });
}
