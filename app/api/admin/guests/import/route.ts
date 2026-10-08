import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE, adminEnabled, isValidSession } from "@/lib/auth";
import { importGuestCsv } from "@/lib/guest-edit";
import { publicUrl } from "@/lib/public-url";

export const runtime = "nodejs";

const MAX_BYTES = 1_000_000;
const MAX_REASONS = 30;

function unavailable() {
  return new Response("Not available", { status: 404 });
}

export async function POST(request: Request) {
  if (!adminEnabled()) return unavailable();
  const cookieStore = await cookies();
  if (!isValidSession(cookieStore.get(ADMIN_COOKIE)?.value)) return unavailable();

  const adminUrl = publicUrl(request, "/admin");
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    adminUrl.searchParams.set("guestError", "Choose a CSV file to upload.");
    return NextResponse.redirect(adminUrl, 303);
  }
  if (file.size > MAX_BYTES) {
    adminUrl.searchParams.set("guestError", "That CSV is too large.");
    return NextResponse.redirect(adminUrl, 303);
  }

  const result = await importGuestCsv(await file.text());
  if (!result.ok) {
    adminUrl.searchParams.set("guestError", result.error);
    return NextResponse.redirect(adminUrl, 303);
  }

  adminUrl.searchParams.set("imported", String(result.added));
  if (result.skipped.length > 0) {
    const reasons = result.skipped.slice(0, MAX_REASONS);
    if (result.skipped.length > MAX_REASONS) reasons.push("Further rows were skipped.");
    adminUrl.searchParams.set("skipped", reasons.join("\n"));
  }
  return NextResponse.redirect(adminUrl, 303);
}
