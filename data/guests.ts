import type { Household } from "@/lib/types";

/**
 * Sample households kept for reference. The site reads the guest list from Postgres.
 * James Hart and James Whitaker share a first name, so "James" asks for a full name.
 */
export const guests: Household[] = [
  {
    token: "k7nq2p",
    events: { service: true, reception: true, party: true },
    people: [{ name: "James Hart" }, { name: "Eleanor Hart" }],
  },
  {
    token: "m3vx8c",
    events: { service: false, reception: false, party: true },
    people: [{ name: "Sam Cole" }],
  },
  {
    token: "p4lw9d",
    events: { service: true, reception: true, party: true },
    people: [{ name: "James Whitaker" }],
  },
  {
    token: "b8rt2e",
    events: { service: false, reception: false, party: true },
    people: [
      { name: "Priya Shah" },
      { name: "Omar Shah" },
      { name: "Leila Shah" },
    ],
  },
];
