import { cookies } from "next/headers";

import { ADMIN_COOKIE, isValidSession } from "@/lib/auth";
import { listHouseholds } from "@/lib/guests";
import { buildRsvpCsv } from "@/lib/rsvp";
import { listRsvps } from "@/lib/rsvp-store";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  if (!isValidSession(cookieStore.get(ADMIN_COOKIE)?.value)) {
    return new Response("Not available", { status: 404 });
  }

  const csv = buildRsvpCsv(listHouseholds(), await listRsvps());
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="rsvps.csv"',
      "Cache-Control": "no-store",
    },
  });
}
