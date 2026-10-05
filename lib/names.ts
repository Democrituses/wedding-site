import "server-only";

import { listHouseholds } from "@/lib/guests";
import type { Household, Person } from "@/lib/types";

export type LookupResult =
  | { status: "found"; token: string }
  | { status: "ambiguous" }
  | { status: "none" };

/** Letters and numbers only, so punctuation and case do not affect a match. */
export function normalizeName(value: string): string {
  return value
    .toLocaleLowerCase("en-GB")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  const space = trimmed.indexOf(" ");
  return space === -1 ? trimmed : trimmed.slice(0, space);
}

function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/** How the household is addressed on the invitation card. */
export function addressLine(people: Person[]): string {
  return joinNames(people.map((person) => firstName(person.name)));
}

export function coupleInitials(first: string, second: string): string {
  const left = first.trim().charAt(0).toLocaleUpperCase("en-GB");
  const right = second.trim().charAt(0).toLocaleUpperCase("en-GB");
  return `${left} & ${right}`;
}

function householdKeys(household: Household): string[] {
  const fullNames = household.people.map((person) => person.name);
  return [
    ...fullNames.map(normalizeName),
    normalizeName(addressLine(household.people)),
    normalizeName(joinNames(fullNames)),
  ];
}

/**
 * Match a typed name to one household.
 * A full name, the household address line, or a unique first name is enough.
 * A first name shared by more than one household asks for the full name,
 * even when that first name is also how a single guest is addressed.
 */
export async function lookupHousehold(query: string): Promise<LookupResult> {
  const households = await listHouseholds();
  const normalized = normalizeName(query);
  if (!normalized) return { status: "none" };

  const matched = new Set<string>();
  const singleWord = !normalized.includes(" ");

  for (const household of households) {
    if (householdKeys(household).includes(normalized)) {
      matched.add(household.token);
    }
    if (!singleWord) continue;
    const sharesFirstName = household.people.some(
      (person) => normalizeName(firstName(person.name)) === normalized,
    );
    if (sharesFirstName) matched.add(household.token);
  }

  if (matched.size === 1) return { status: "found", token: [...matched][0] };
  if (matched.size > 1) return { status: "ambiguous" };
  return { status: "none" };
}
