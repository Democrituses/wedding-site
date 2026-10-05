import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE, adminEnabled, isValidSession } from "@/lib/auth";
import { addHousehold } from "@/lib/guest-edit";
import type { EventAttendance } from "@/lib/types";

export const runtime = "nodejs";

function unavailable() {
  return new Response("Not available", { status: 404 });
}

function ticked(form: FormData, name: string): boolean {
  return form.get(name) !== null;
}

export async function POST(request: Request) {
  if (!adminEnabled()) return unavailable();
  const cookieStore = await cookies();
  if (!isValidSession(cookieStore.get(ADMIN_COOKIE)?.value)) return unavailable();

  const form = await request.formData();
  const names = String(form.get("names") ?? "").split(/\r?\n/);
  const events: EventAttendance = {
    service: ticked(form, "service"),
    reception: ticked(form, "reception"),
    party: ticked(form, "party"),
  };
  const result = await addHousehold(names, events);

  const adminUrl = new URL("/admin", request.url);
  if (!result.ok) adminUrl.searchParams.set("guestError", result.error);
  else adminUrl.searchParams.set("added", result.household.token);
  return NextResponse.redirect(adminUrl, 303);
}
