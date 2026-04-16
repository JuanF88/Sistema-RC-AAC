import crypto from "node:crypto";
import { NextResponse } from "next/server";

import { closeOtherActiveSessionsForUser, registerLoginAudit } from "@/lib/audit";
import { getSessionCookieMaxAgeSeconds, issueSessionToken, SESSION_COOKIE_NAME, validateCredentials } from "@/lib/auth";

type LoginPayload = {
  username?: string;
  password?: string;
};

function getIpAddress(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.trim();
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip")?.trim() || null;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LoginPayload;
    const username = payload.username?.trim() ?? "";
    const password = payload.password?.trim() ?? "";

    if (!username || !password) {
      return NextResponse.json({ error: "Usuario y contraseña son obligatorios." }, { status: 400 });
    }

    const validUser = await validateCredentials(username, password);
    if (!validUser) {
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }

    const sid = crypto.randomUUID();
    const maxAge = getSessionCookieMaxAgeSeconds();
    const token = issueSessionToken({
      sid,
      username: validUser.username,
      displayName: validUser.displayName,
      role: validUser.role,
      ttlSeconds: maxAge,
    });

    await registerLoginAudit({
      sessionId: sid,
      username: validUser.username,
      displayName: validUser.displayName,
      ipAddress: getIpAddress(request),
      userAgent: request.headers.get("user-agent"),
    });

    // Enforce a single active session per username.
    await closeOtherActiveSessionsForUser({ username: validUser.username, keepSessionId: sid });

    const response = NextResponse.json({
      ok: true,
      user: { username: validUser.username, displayName: validUser.displayName, role: validUser.role },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown login error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
