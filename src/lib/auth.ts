import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

export const COOKIE_NAME = "faculty_admin_session";

const WEAK_DEFAULTS = new Set(["admin123", "password", "admin", "123456"]);

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function getPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (isProduction()) {
    if (!password || !password.trim()) {
      throw new Error(
        "ADMIN_PASSWORD must be set in production. Do not use the demo default."
      );
    }
    if (WEAK_DEFAULTS.has(password.trim())) {
      throw new Error(
        "ADMIN_PASSWORD is too weak for production. Set a strong unique password."
      );
    }
    return password;
  }
  return password || "admin123";
}

function getSecret(): string {
  const secret =
    process.env.ADMIN_SECRET ||
    process.env.ADMIN_SESSION_SECRET;
  if (isProduction()) {
    if (!secret || !secret.trim()) {
      throw new Error(
        "ADMIN_SECRET (or ADMIN_SESSION_SECRET) must be set in production."
      );
    }
    return secret;
  }
  return secret || `demo-secret-${getPassword()}`;
}

export function createSessionToken(): string {
  const payload = `admin:${Date.now()}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot < 0) return false;
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const expected = createHmac("sha256", getSecret())
      .update(payload)
      .digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function checkPassword(password: string): boolean {
  const expected = getPassword();
  try {
    const a = Buffer.from(password);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function isAdminAuthenticated(): boolean {
  const token = cookies().get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: isProduction(),
  };
}
