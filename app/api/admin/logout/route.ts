import { NextResponse } from "next/server";

import { ADMIN_COOKIE } from "@/lib/auth";
import { publicUrl } from "@/lib/public-url";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const response = NextResponse.redirect(publicUrl(request, "/admin"), 303);
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
