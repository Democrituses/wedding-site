import type { EventId, InviteType } from "@/lib/types";

export type { EventId };

export type WeddingEvent = {
  id: EventId;
  title: string;
  visibleTo: InviteType[];
  time: string;
  venue: string;
  address: string;
  dress: string;
  travel: string;
  notes: string;
};

export type TimelineItem = {
  id: string;
  eventId: EventId;
  time: string;
  title: string;
  detail: string;
};

export type Wedding = {
  couple: { first: string; second: string };
  dateLabel: string;
  events: WeddingEvent[];
  timeline: TimelineItem[];
};

/**
 * Wedding copy. Leave a string empty to show "To be confirmed".
 * Party invitations only receive events whose visibleTo includes "party".
 */
export const wedding: Wedding = {
  couple: {
    first: "Maisie",
    second: "Aidan",
  },
  dateLabel: "22nd May 2027",

  // Church, reception, and the evening party. Each event carries its own dress and travel notes.
  events: [
    {
      id: "service",
      title: "Church service",
      visibleTo: ["full"],
      time: "",
      venue: "St Disens Church",
      address: "6 Church Street, Bradninch, Exeter, EX5 4NS, England, UK, Earth, Solar System, Milky Way, Universe",
      dress: "Colourful yet formal",
      militaryDress: "test",
      travel: "",
      notes: "",
    },
    {
      id: "reception",
      title: "Reception",
      visibleTo: ["full"],
      time: "",
      venue: "Officers' Mess",
      address: "",
      dress: "",
      travel: "",
      notes: "",
    },
    {
      id: "party",
      title: "Evening party",
      visibleTo: ["full", "party"],
      time: "",
      venue: "Officers' Mess",
      address: "",
      dress: "",
      travel: "",
      notes: "",
    },
  ],

  // Shown in The day, in order, and only when that event is on the invitation.
  timeline: [
    {
      id: "service",
      eventId: "service",
      time: "",
      title: "Church service",
      detail: "The marriage ceremony.",
    },
    {
      id: "reception",
      eventId: "reception",
      time: "",
      title: "Reception",
      detail: "A wedding breakfast at the Officers' Mess.",
    },
    {
      id: "party",
      eventId: "party",
      time: "",
      title: "Evening party",
      detail: "Drinks and dancing in the mess.",
    },
  ],
};
