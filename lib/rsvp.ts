import "server-only";

import { invitedEventIds, invitedLabel } from "@/lib/content";
import { findHousehold } from "@/lib/guests";
import type { EventAttendance, EventId, Household, Rsvp } from "@/lib/types";
import { EVENT_IDS } from "@/lib/types";

const MAX_NOTE = 1000;

export type RsvpDraft = Omit<Rsvp, "updatedAt">;

export type ParseResult =
  | { ok: true; rsvp: RsvpDraft }
  | { ok: false; error: string };

const emptyEvents = (): EventAttendance => ({
  service: false,
  reception: false,
  party: false,
});

function asText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length > max) return null;
  return trimmed;
}

/**
 * Accept a reply only for the events this household was invited to.
 * An unticked event is stored as not attending.
 */
export async function parseRsvpSubmission(body: unknown): Promise<ParseResult> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Could not read that reply." };
  }

  const record = body as Record<string, unknown>;
  const token = typeof record.token === "string" ? record.token : "";
  const household = await findHousehold(token);
  if (!household) {
    return { ok: false, error: "This invitation could not be found." };
  }

  if (typeof record.attending !== "boolean") {
    return { ok: false, error: "Please accept or decline." };
  }

  const message = asText(record.message, MAX_NOTE);
  const dietary = asText(record.dietary, MAX_NOTE);
  if (message === null || dietary === null) {
    return { ok: false, error: "Please shorten your note." };
  }

  if (!record.attending) {
    return {
      ok: true,
      rsvp: {
        token: household.token,
        attending: false,
        events: emptyEvents(),
        people: [],
        dietary: "",
        message,
      },
    };
  }

  const allowedNames = new Set(household.people.map((person) => person.name));
  if (!Array.isArray(record.people)) {
    return { ok: false, error: "Choose who is coming." };
  }
  const people = record.people.filter(
    (name): name is string => typeof name === "string" && allowedNames.has(name),
  );
  const uniquePeople = [...new Set(people)];
  if (uniquePeople.length === 0) {
    return { ok: false, error: "Choose who is coming." };
  }

  const invited = invitedEventIds(household.events);
  const requested =
    record.events && typeof record.events === "object"
      ? (record.events as Record<string, unknown>)
      : {};
  const events = emptyEvents();
  if (invited.length === 1) {
    events[invited[0]] = true;
  } else {
    for (const eventId of invited) {
      events[eventId] = requested[eventId] === true;
    }
  }
  if (!EVENT_IDS.some((eventId) => events[eventId])) {
    return {
      ok: false,
      error: "Choose which parts of the day you can come to.",
    };
  }

  return {
    ok: true,
    rsvp: {
      token: household.token,
      attending: true,
      events,
      people: uniquePeople,
      dietary,
      message,
    },
  };
}

/** People coming to an event. Null means this household was not invited to it, or has not replied. */
export function attendanceCount(
  household: Household,
  rsvp: Rsvp | undefined,
  eventId: EventId,
): number | null {
  if (!household.events[eventId] || !rsvp) return null;
  if (!rsvp.attending || !rsvp.events[eventId]) return 0;
  return rsvp.people.length;
}

export type RsvpSummary = {
  service: number;
  reception: number;
  party: number;
  accepted: number;
  declined: number;
  awaiting: number;
};

export function summariseRsvps(
  households: Household[],
  replies: Rsvp[],
): RsvpSummary {
  const byToken = new Map(replies.map((reply) => [reply.token, reply]));
  const summary: RsvpSummary = {
    service: 0,
    reception: 0,
    party: 0,
    accepted: 0,
    declined: 0,
    awaiting: 0,
  };

  for (const household of households) {
    const reply = byToken.get(household.token);
    if (!reply) {
      summary.awaiting += 1;
      continue;
    }
    if (!reply.attending) {
      summary.declined += 1;
      continue;
    }
    summary.accepted += 1;
    for (const eventId of EVENT_IDS) {
      const count = attendanceCount(household, reply, eventId);
      if (count) summary[eventId] += count;
    }
  }

  return summary;
}

function csvCell(value: string): string {
  let safe = value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  if (/^[=+\-@]/.test(safe)) safe = `'${safe}`;
  if (/[",\n]/.test(safe)) return `"${safe.replaceAll('"', '""')}"`;
  return safe;
}

export function buildRsvpCsv(households: Household[], replies: Rsvp[]): string {
  const byToken = new Map(replies.map((reply) => [reply.token, reply]));
  const header = [
    "Household",
    "Invite",
    "Private link",
    "Reply",
    "Service",
    "Reception",
    "Party",
    "Guests",
    "Dietary",
    "Message",
    "Updated",
  ];
  const rows = households.map((household) => {
    const reply = byToken.get(household.token);
    const replyLabel = !reply
      ? "Awaiting reply"
      : reply.attending
        ? "Accepted"
        : "Declined";
    const cells = [
      household.people.map((person) => person.name).join("; "),
      invitedLabel(household.events, "; "),
      `/i/${household.token}`,
      replyLabel,
      ...EVENT_IDS.map((eventId) => {
        const count = attendanceCount(household, reply ?? undefined, eventId);
        return count === null ? "" : String(count);
      }),
      reply?.attending ? reply.people.join("; ") : "",
      reply?.dietary ?? "",
      reply?.message ?? "",
      reply?.updatedAt ?? "",
    ];
    return cells.map(csvCell).join(",");
  });
  return [header.join(","), ...rows].join("\n");
}
