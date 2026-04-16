import { NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ ok: false, active: false }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    active: true,
    user: {
      username: session.username,
      displayName: session.displayName,
      role: session.role,
    },
  });
}