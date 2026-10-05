import "server-only";

import { randomBytes } from "crypto";

import { parseCsv } from "@/lib/csv";
import { withHouseholds } from "@/lib/guest-store";
import { normalizeName } from "@/lib/names";
import type { EventAttendance, Household } from "@/lib/types";
import { EVENT_IDS } from "@/lib/types";

const MAX_NAME = 80;
const TOKEN_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

const COLUMNS = ["household", "name", "service", "reception", "party"] as const;

export type GuestEditResult =
  | { ok: true; household: Household }
  | { ok: false; error: string };

export type GuestImportResult =
  | { ok: true; added: number; skipped: string[] }
  | { ok: false; error: string };

export function cleanGuestName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function takenNames(households: Household[]): Set<string> {
  const taken = new Set<string>();
  for (const household of households) {
    for (const person of household.people) {
      const key = normalizeName(person.name);
      if (key) taken.add(key);
    }
  }
  return taken;
}

function createToken(used: Set<string>): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const bytes = randomBytes(8);
    let token = "";
    for (let index = 0; index < 8; index += 1) {
      token += TOKEN_ALPHABET[bytes[index] % TOKEN_ALPHABET.length];
    }
    if (!used.has(token)) return token;
  }
  throw new Error("Could not create a private link.");
}

function validateNames(
  names: string[],
): { ok: true; names: string[] } | { ok: false; error: string } {
  if (names.length === 0) return { ok: false, error: "Enter at least one name." };
  const seen = new Set<string>();
  for (const name of names) {
    if (name.length > MAX_NAME) return { ok: false, error: "Please shorten a name." };
    const key = normalizeName(name);
    if (!key) return { ok: false, error: "Enter at least one name." };
    if (seen.has(key)) return { ok: false, error: "A name is repeated." };
    seen.add(key);
  }
  return { ok: true, names };
}

export function addHousehold(
  rawNames: string[],
  events: EventAttendance,
): Promise<GuestEditResult> {
  const names = rawNames.map(cleanGuestName).filter(Boolean);
  const parsed = validateNames(names);
  if (!parsed.ok) return Promise.resolve(parsed);
  if (!EVENT_IDS.some((eventId) => events[eventId])) {
    return Promise.resolve({
      ok: false,
      error: "Choose at least one part of the day.",
    });
  }

  return withHouseholds((households): { households: Household[]; result: GuestEditResult } => {
    const taken = takenNames(households);
    for (const name of parsed.names) {
      if (taken.has(normalizeName(name))) {
        return {
          households,
          result: { ok: false as const, error: `${name} is already on the list.` },
        };
      }
    }

    const household: Household = {
      token: createToken(new Set(households.map((item) => item.token))),
      events: {
        service: events.service === true,
        reception: events.reception === true,
        party: events.party === true,
      },
      people: parsed.names.map((name) => ({ name })),
    };
    return {
      households: [...households, household],
      result: { ok: true as const, household },
    };
  });
}

export function removeHousehold(token: string): Promise<boolean> {
  return withHouseholds((households) => {
    const next = households.filter((household) => household.token !== token);
    if (next.length === households.length) return { households, result: false };
    return { households: next, result: true };
  });
}

function parseFlag(value: string): boolean | null {
  const flag = value.trim().toLocaleLowerCase("en-GB");
  if (flag === "yes" || flag === "y" || flag === "true" || flag === "1") return true;
  if (flag === "no" || flag === "n" || flag === "false" || flag === "0" || flag === "") {
    return false;
  }
  return null;
}

function eventsKey(events: EventAttendance): string {
  return EVENT_IDS.map((eventId) => (events[eventId] ? "1" : "0")).join("");
}

function rowLabel(lines: number[]): string {
  const sorted = [...lines].sort((left, right) => left - right);
  if (sorted.length === 1) return `Row ${sorted[0]} was skipped`;
  return `Rows ${sorted.join(", ")} were skipped`;
}

type ImportRow = {
  line: number;
  group: string;
  name: string;
  events: EventAttendance | null;
  flagError: boolean;
};

function columnIndex(header: string[]): Record<(typeof COLUMNS)[number], number> | null {
  const index = new Map(header.map((name, position) => [name.trim().toLocaleLowerCase("en-GB"), position]));
  const found = {} as Record<(typeof COLUMNS)[number], number>;
  for (const column of COLUMNS) {
    const position = index.get(column);
    if (position === undefined) return null;
    found[column] = position;
  }
  return found;
}

function cell(row: string[], position: number): string {
  return row[position] ?? "";
}

/**
 * Group CSV rows into households, then append the valid ones in one write.
 * A group is skipped whole when any of its rows cannot be saved.
 */
export function importGuestCsv(text: string): Promise<GuestImportResult> {
  const table = parseCsv(text);
  if (table.length === 0) {
    return Promise.resolve({ ok: false, error: "The CSV has no guests." });
  }

  const columns = columnIndex(table[0]);
  if (!columns) {
    return Promise.resolve({
      ok: false,
      error: "The CSV needs columns household, name, service, reception, and party.",
    });
  }

  const data = table.slice(1).flatMap((row, offset) => {
    if (row.every((value) => value.trim() === "")) return [];
    return [{ row, line: offset + 2 }];
  });
  if (data.length === 0) {
    return Promise.resolve({ ok: false, error: "The CSV has no guests." });
  }

  const rows: ImportRow[] = data.map(({ row, line }) => {
    const service = parseFlag(cell(row, columns.service));
    const reception = parseFlag(cell(row, columns.reception));
    const party = parseFlag(cell(row, columns.party));
    const flagError = service === null || reception === null || party === null;
    const household = cell(row, columns.household).trim();
    return {
      line,
      group: household ? household.toLocaleLowerCase("en-GB") : `row:${line}`,
      name: cleanGuestName(cell(row, columns.name)),
      events: flagError
        ? null
        : { service: service === true, reception: reception === true, party: party === true },
      flagError,
    };
  });

  const groups = new Map<string, ImportRow[]>();
  for (const row of rows) {
    const group = groups.get(row.group);
    if (group) group.push(row);
    else groups.set(row.group, [row]);
  }

  return withHouseholds((households): {
    households: Household[];
    result: Extract<GuestImportResult, { ok: true }>;
  } => {
    const taken = takenNames(households);
    const usedTokens = new Set(households.map((household) => household.token));
    const created: Household[] = [];
    const skipped: string[] = [];

    for (const group of groups.values()) {
      const lines = group.map((row) => row.line);
      const reason = groupProblem(group, taken);
      if (reason) {
        skipped.push(`${rowLabel(lines)}: ${reason}`);
        continue;
      }

      const events = group[0].events;
      if (!events) continue;
      const household: Household = {
        token: createToken(usedTokens),
        events,
        people: group.map((row) => ({ name: row.name })),
      };
      usedTokens.add(household.token);
      for (const person of household.people) taken.add(normalizeName(person.name));
      created.push(household);
    }

    return {
      households: created.length > 0 ? [...households, ...created] : households,
      result: { ok: true as const, added: created.length, skipped },
    };
  });
}

function groupProblem(group: ImportRow[], taken: Set<string>): string | null {
  if (group.some((row) => row.flagError || !row.events)) {
    return "an event cell is not yes or no.";
  }

  const signature = eventsKey(group[0].events as EventAttendance);
  if (group.some((row) => eventsKey(row.events as EventAttendance) !== signature)) {
    return "event ticks do not match.";
  }

  if (!EVENT_IDS.some((eventId) => (group[0].events as EventAttendance)[eventId])) {
    return "no event is ticked.";
  }

  const seen = new Set<string>();
  for (const row of group) {
    if (!row.name || !normalizeName(row.name)) return "a name is missing.";
    if (row.name.length > MAX_NAME) return "a name is too long.";
    const key = normalizeName(row.name);
    if (seen.has(key)) return "a name is repeated.";
    seen.add(key);
    if (taken.has(key)) return `${row.name} is already on the list.`;
  }

  return null;
}
