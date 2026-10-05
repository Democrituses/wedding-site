import "server-only";

import { readHouseholds, TOKEN_PATTERN } from "@/lib/guest-store";
import type { Household } from "@/lib/types";

export function findHousehold(token: string): Promise<Household | undefined> {
  if (!TOKEN_PATTERN.test(token)) return Promise.resolve(undefined);
  return readHouseholds().then((households) =>
    households.find((household) => household.token === token),
  );
}

export function listHouseholds(): Promise<Household[]> {
  return readHouseholds();
}
