import { parseRsvpSubmission } from "@/lib/rsvp";
import { getRsvp, saveRsvp } from "@/lib/rsvp-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Could not read that reply." },
      { status: 400 },
    );
  }

  const parsed = await parseRsvpSubmission(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const existing = await getRsvp(parsed.rsvp.token);
  const saved = {
    ...parsed.rsvp,
    updatedAt: new Date().toISOString(),
  };
  await saveRsvp(saved);

  return Response.json(
    { rsvp: saved, updated: existing !== null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
