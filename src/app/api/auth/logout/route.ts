import { NextResponse } from "next/server";

import { registerLogoutAudit } from "@/lib/audit";
import { getSessionFromRequest, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    if (session) {
      await registerLogoutAudit(session.sid);
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown logout error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
