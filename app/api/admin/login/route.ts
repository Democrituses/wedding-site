import { NextResponse } from "next/server";

import {
  ADMIN_COOKIE,
  adminCookieOptions,
  adminEnabled,
  createSessionValue,
  passwordMatches,
} from "@/lib/auth";
import { publicUrl } from "@/lib/public-url";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const adminUrl = publicUrl(request, "/admin");
  if (!adminEnabled()) {
    return NextResponse.redirect(adminUrl, 303);
  }

  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  if (!passwordMatches(password)) {
    adminUrl.searchParams.set("error", "1");
    return NextResponse.redirect(adminUrl, 303);
  }

  const response = NextResponse.redirect(publicUrl(request, "/admin"), 303);
  response.cookies.set(ADMIN_COOKIE, createSessionValue(), adminCookieOptions());
  return response;
}
