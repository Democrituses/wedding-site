import "server-only";

import { wedding, type TimelineItem, type WeddingEvent } from "@/data/wedding";
import type { InviteType } from "@/lib/types";

export function visibleEvents(invite: InviteType): WeddingEvent[] {
  return wedding.events.filter((event) => event.visibleTo.includes(invite));
}

export function visibleTimeline(invite: InviteType): TimelineItem[] {
  const allowed = new Set(visibleEvents(invite).map((event) => event.id));
  return wedding.timeline.filter((item) => allowed.has(item.eventId));
}

export function isConfirmed(value: string): boolean {
  return value.trim().length > 0;
}
