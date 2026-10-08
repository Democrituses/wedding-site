import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE, adminEnabled, isValidSession } from "@/lib/auth";
import { removeHousehold } from "@/lib/guest-edit";
import { TOKEN_PATTERN } from "@/lib/guest-store";
import { publicUrl } from "@/lib/public-url";

export const runtime = "nodejs";

function unavailable() {
  return new Response("Not available", { status: 404 });
}

export async function POST(request: Request) {
  if (!adminEnabled()) return unavailable();
  const cookieStore = await cookies();
  if (!isValidSession(cookieStore.get(ADMIN_COOKIE)?.value)) return unavailable();

  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  const adminUrl = publicUrl(request, "/admin");
  if (!TOKEN_PATTERN.test(token) || !(await removeHousehold(token))) {
    adminUrl.searchParams.set("guestError", "That household could not be found.");
    return NextResponse.redirect(adminUrl, 303);
  }

  adminUrl.searchParams.set("removed", "1");
  return NextResponse.redirect(adminUrl, 303);
}
