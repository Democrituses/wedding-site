import type { Household } from "@/lib/types";

/**
 * Households. The token is the private link (/i/token).
 * Names are matched on the home page, so spell them as they should be typed.
 * James Hart and James Whitaker share a first name, so "James" asks for a full name.
 */
export const guests: Household[] = [
  {
    token: "k7nq2p",
    invite: "full",
    people: [{ name: "James Hart" }, { name: "Eleanor Hart" }],
  },
  {
    token: "m3vx8c",
    invite: "party",
    people: [{ name: "Sam Cole" }],
  },
  {
    token: "p4lw9d",
    invite: "full",
    people: [{ name: "James Whitaker" }],
  },
  {
    token: "b8rt2e",
    invite: "party",
    people: [
      { name: "Priya Shah" },
      { name: "Omar Shah" },
      { name: "Leila Shah" },
    ],
  },
];
