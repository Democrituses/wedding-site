export type InviteType = "full" | "party";

export type Person = {
  name: string;
};

export type Household = {
  token: string;
  invite: InviteType;
  people: Person[];
};

export type EventId = "service" | "reception" | "party";

export type EventAttendance = Record<EventId, boolean>;

export type Rsvp = {
  token: string;
  attending: boolean;
  events: EventAttendance;
  people: string[];
  dietary: string;
  message: string;
  updatedAt: string;
};

export const EVENT_IDS: EventId[] = ["service", "reception", "party"];
