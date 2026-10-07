import { TOKEN_PATTERN } from "@/lib/guest-store";
import { readScoreBoard, recordScore } from "@/lib/scores";

export const runtime = "nodejs";

const headers = { "Cache-Control": "no-store" };

function tokenFrom(value: unknown): string | null {
  return typeof value === "string" && TOKEN_PATTERN.test(value) ? value : null;
}

export async function GET(request: Request) {
  const token = tokenFrom(new URL(request.url).searchParams.get("token"));
  if (!token) {
    return Response.json({ error: "Unknown invitation." }, { status: 400, headers });
  }

  const board = await readScoreBoard(token);
  if (!board) {
    return Response.json({ error: "Unknown invitation." }, { status: 404, headers });
  }
  return Response.json(board, { headers });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Could not read that score." }, { status: 400, headers });
  }

  const token = tokenFrom(
    body && typeof body === "object" ? (body as { token?: unknown }).token : null,
  );
  if (!token) {
    return Response.json({ error: "Unknown invitation." }, { status: 400, headers });
  }

  const board = await recordScore(token);
  if (!board) {
    return Response.json({ error: "Unknown invitation." }, { status: 404, headers });
  }
  return Response.json(board, { headers });
}
