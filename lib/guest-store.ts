import "server-only";

import { readFile, rename, writeFile } from "fs/promises";
import path from "path";

import { guests as seedGuests } from "@/data/guests";
import type { EventAttendance, Household } from "@/lib/types";
import { EVENT_IDS } from "@/lib/types";

type Store = {
  households: Household[];
};

const filePath = path.join(process.cwd(), "data", "guests.json");

export const TOKEN_PATTERN = /^[a-z0-9]{6,32}$/;

// Writes are queued so two admin saves cannot overwrite each other.
let chain: Promise<void> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function copyHouseholds(households: Household[]): Household[] {
  return households.map((household) => ({
    token: household.token,
    events: { ...household.events },
    people: household.people.map((person) => ({ name: person.name })),
  }));
}

function isEvents(value: unknown): value is EventAttendance {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return EVENT_IDS.every((eventId) => typeof record[eventId] === "boolean");
}

function isHousehold(value: unknown): value is Household {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.token !== "string" || !TOKEN_PATTERN.test(record.token)) return false;
  if (!isEvents(record.events)) return false;
  if (!Array.isArray(record.people) || record.people.length === 0) return false;
  return record.people.every((person) => {
    if (!person || typeof person !== "object") return false;
    const name = (person as { name?: unknown }).name;
    return typeof name === "string" && name.trim().length > 0;
  });
}

async function writeStore(store: Store): Promise<void> {
  const temporary = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(temporary, filePath);
}

// A missing file is filled from the seed. An existing file is never replaced by it.
async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Store;
    if (!parsed || !Array.isArray(parsed.households)) {
      throw new Error("Guest list is unreadable.");
    }
    if (!parsed.households.every(isHousehold)) {
      throw new Error("Guest list is unreadable.");
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      const seeded = { households: copyHouseholds(seedGuests) };
      await writeStore(seeded);
      return seeded;
    }
    throw error;
  }
}

export function readHouseholds(): Promise<Household[]> {
  return enqueue(async () => (await readStore()).households);
}

export function withHouseholds<T>(
  change: (
    households: Household[],
  ) =>
    | { households: Household[]; result: T }
    | Promise<{ households: Household[]; result: T }>,
): Promise<T> {
  return enqueue(async () => {
    const store = await readStore();
    const next = await change(store.households);
    if (next.households !== store.households) {
      await writeStore({ households: next.households });
    }
    return next.result;
  });
}
