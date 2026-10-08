import "server-only";

import type postgres from "postgres";

import { withDb } from "@/lib/db";
import type { Household } from "@/lib/types";

export const TOKEN_PATTERN = /^[a-z0-9]{6,32}$/;

// One lock for the whole guest list, so two admin saves cannot interleave.
const HOUSEHOLD_LOCK_A = 481516;
const HOUSEHOLD_LOCK_B = 2342;

type Query = postgres.TransactionSql;

type HouseholdRow = {
  token: string;
  service: boolean;
  reception: boolean;
  party: boolean;
};

type PersonRow = {
  token: string;
  position: number;
  name: string;
};

async function loadHouseholds(tx: Query): Promise<Household[]> {
  const households = await tx<HouseholdRow[]>`
    SELECT token, service, reception, party
    FROM households
    ORDER BY token
  `;
  const people = await tx<PersonRow[]>`
    SELECT token, position, name
    FROM household_people
    ORDER BY token, position
  `;

  const byToken = new Map<string, { name: string }[]>();
  for (const person of people) {
    const list = byToken.get(person.token);
    const entry = { name: person.name };
    if (list) list.push(entry);
    else byToken.set(person.token, [entry]);
  }

  return households.map((household) => ({
    token: household.token,
    events: {
      service: household.service,
      reception: household.reception,
      party: household.party,
    },
    people: byToken.get(household.token) ?? [],
  }));
}

async function saveHouseholds(tx: Query, households: Household[]): Promise<void> {
  // Replies and scores are separate tables, so replacing the guest list leaves them in place.
  await tx`DELETE FROM households`;
  for (const household of households) {
    await tx`
      INSERT INTO households (token, service, reception, party)
      VALUES (
        ${household.token},
        ${household.events.service},
        ${household.events.reception},
        ${household.events.party}
      )
    `;
  }

  const people = households.flatMap((household) =>
    household.people.map((person, position) => ({
      token: household.token,
      position,
      name: person.name,
    })),
  );
  if (people.length === 0) return;
  await tx`
    INSERT INTO household_people ${tx(people, "token", "position", "name")}
  `;
}

export function readHouseholds(): Promise<Household[]> {
  return withDb((tx) => loadHouseholds(tx));
}

export function withHouseholds<T>(
  change: (
    households: Household[],
  ) =>
    | { households: Household[]; result: T }
    | Promise<{ households: Household[]; result: T }>,
): Promise<T> {
  return withDb(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(${HOUSEHOLD_LOCK_A}, ${HOUSEHOLD_LOCK_B})`;
    const households = await loadHouseholds(tx);
    const next = await change(households);
    if (next.households !== households) await saveHouseholds(tx, next.households);
    return next.result;
  });
}
