import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "wedding_admin";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function sessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET?.trim() ?? "";
  return secret.length >= 16 ? secret : null;
}

export function adminPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD?.trim() ?? "";
  return password.length > 0 ? password : null;
}

/** Admin stays unavailable until both the password and the signing secret are set. */
export function adminEnabled(): boolean {
  return adminPassword() !== null && sessionSecret() !== null;
}

function sign(payload: string): string {
  const secret = sessionSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionValue(): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `v1.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function isValidSession(value: string | undefined): boolean {
  if (!value || !sessionSecret()) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [version, expiresAt, signature] = parts;
  if (version !== "v1") return false;
  const payload = `${version}.${expiresAt}`;
  const expected = sign(payload);
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    return false;
  }
  const expiry = Number(expiresAt);
  return Number.isFinite(expiry) && expiry > Date.now();
}

export function passwordMatches(input: string): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  const given = Buffer.from(input);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length) return false;
  return timingSafeEqual(given, wanted);
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
