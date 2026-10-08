import "server-only";

import { withDb } from "@/lib/db";
import type { Rsvp } from "@/lib/types";

type RsvpRow = {
  token: string;
  attending: boolean;
  service: boolean;
  reception: boolean;
  party: boolean;
  dietary: string;
  message: string;
  updated_at: Date;
  people: string[];
};

function toRsvp(row: RsvpRow): Rsvp {
  return {
    token: row.token,
    attending: row.attending,
    events: {
      service: row.service,
      reception: row.reception,
      party: row.party,
    },
    people: row.people,
    dietary: row.dietary,
    message: row.message,
    updatedAt: row.updated_at.toISOString(),
  };
}

export function getRsvp(token: string): Promise<Rsvp | null> {
  return withDb(async (tx) => {
    const rows = await tx<RsvpRow[]>`
      SELECT token, attending, service, reception, party, dietary, message, updated_at, people
      FROM rsvps
      WHERE token = ${token}
    `;
    return rows[0] ? toRsvp(rows[0]) : null;
  });
}

export function listRsvps(): Promise<Rsvp[]> {
  return withDb(async (tx) => {
    const rows = await tx<RsvpRow[]>`
      SELECT token, attending, service, reception, party, dietary, message, updated_at, people
      FROM rsvps
      ORDER BY updated_at
    `;
    return rows.map(toRsvp);
  });
}

export function saveRsvp(rsvp: Rsvp): Promise<void> {
  return withDb(async (tx) => {
    await tx`
      INSERT INTO rsvps (
        token, attending, service, reception, party, dietary, message, updated_at, people
      ) VALUES (
        ${rsvp.token},
        ${rsvp.attending},
        ${rsvp.events.service},
        ${rsvp.events.reception},
        ${rsvp.events.party},
        ${rsvp.dietary},
        ${rsvp.message},
        ${new Date(rsvp.updatedAt)},
        ${rsvp.people}
      )
      ON CONFLICT (token) DO UPDATE SET
        attending = EXCLUDED.attending,
        service = EXCLUDED.service,
        reception = EXCLUDED.reception,
        party = EXCLUDED.party,
        dietary = EXCLUDED.dietary,
        message = EXCLUDED.message,
        updated_at = EXCLUDED.updated_at,
        people = EXCLUDED.people
    `;
  });
}
