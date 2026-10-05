import "server-only";

import { wedding, type TimelineItem, type WeddingEvent } from "@/data/wedding";
import type { EventAttendance, EventId } from "@/lib/types";
import { EVENT_IDS } from "@/lib/types";

const EVENT_LABELS: Record<EventId, string> = {
  service: "Service",
  reception: "Reception",
  party: "Party",
};

export function visibleEvents(invited: EventAttendance): WeddingEvent[] {
  return wedding.events.filter((event) => invited[event.id]);
}

export function visibleTimeline(invited: EventAttendance): TimelineItem[] {
  const allowed = new Set(visibleEvents(invited).map((event) => event.id));
  return wedding.timeline.filter((item) => allowed.has(item.eventId));
}

export function invitedEventIds(events: EventAttendance): EventId[] {
  return EVENT_IDS.filter((eventId) => events[eventId]);
}

export function isPartyOnly(events: EventAttendance): boolean {
  return events.party && !events.service && !events.reception;
}

export function invitedLabel(events: EventAttendance, separator = ", "): string {
  return invitedEventIds(events)
    .map((eventId) => EVENT_LABELS[eventId])
    .join(separator);
}

function joinPhrase(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

/** The card sentence. The two original invitations keep their exact wording. */
export function invitationRequest(events: EventAttendance): string {
  const { service, reception, party } = events;
  if (service && reception && party) {
    return "request the pleasure of your company at their marriage, and afterwards at the reception and the evening party";
  }
  if (!service && !reception && party) {
    return "request the pleasure of your company at the evening party";
  }

  const afterwards: string[] = [];
  if (reception) afterwards.push("the reception");
  if (party) afterwards.push("the evening party");
  if (service && afterwards.length === 0) {
    return "request the pleasure of your company at their marriage";
  }
  if (service) {
    return `request the pleasure of your company at their marriage, and afterwards at ${joinPhrase(afterwards)}`;
  }

  const parts: string[] = [];
  if (reception) parts.push("the reception");
  if (party) parts.push("the evening party");
  return `request the pleasure of your company at ${joinPhrase(parts)}`;
}

export function isConfirmed(value: string): boolean {
  return value.trim().length > 0;
}
