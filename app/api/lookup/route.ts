import { lookupHousehold } from "@/lib/names";

export const runtime = "nodejs";

const WINDOW_MS = 60_000;
const LIMIT = 20;
const hits = new Map<string, number[]>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

function isLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > LIMIT;
}

export async function POST(request: Request) {
  if (isLimited(clientKey(request))) {
    return Response.json(
      { status: "limited" },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  let name = "";
  try {
    const body = (await request.json()) as { name?: unknown };
    if (typeof body.name === "string") name = body.name.slice(0, 120);
  } catch {
    name = "";
  }

  const result = await lookupHousehold(name);
  return Response.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
