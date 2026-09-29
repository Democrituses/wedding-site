import "server-only";

import { guests } from "@/data/guests";
import type { Household } from "@/lib/types";

const tokenPattern = /^[a-z0-9]{6,32}$/;

export function findHousehold(token: string): Household | undefined {
  if (!tokenPattern.test(token)) return undefined;
  return guests.find((household) => household.token === token);
}

export function listHouseholds(): Household[] {
  return guests;
}
