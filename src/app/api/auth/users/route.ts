import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { registerChangeAudit } from "@/lib/audit";
import { getSessionFromRequest, hashAuthPassword } from "@/lib/auth";

type UserRole = "administrador" | "usuario" | "visualizador";

type CreateUserPayload = {
  username?: string;
  displayName?: string;
  password?: string;
  role?: UserRole;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for auth users.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function parseRole(role: string | undefined): UserRole {
  if (role === "administrador" || role === "usuario" || role === "visualizador") return role;
  return "usuario";
}

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Sesion no valida o expirada." }, { status: 401 });
    if (session.role !== "administrador") return NextResponse.json({ error: "Permisos insuficientes." }, { status: 403 });

    const client = getAdminClient();
    const { data, error } = await client
      .from("auth_app_users")
      .select("id,username,display_name,role,is_active,created_at,updated_at")
      .order("role", { ascending: true })
      .order("username", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown users read error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Sesion no valida o expirada." }, { status: 401 });
    if (session.role !== "administrador") return NextResponse.json({ error: "Permisos insuficientes." }, { status: 403 });

    const payload = (await request.json()) as CreateUserPayload;
    const username = payload.username?.trim().toLowerCase() ?? "";
    const displayName = payload.displayName?.trim() ?? "";
    const password = payload.password?.trim() ?? "";
    const role = parseRole(payload.role);

    if (!username || !displayName || !password) {
      return NextResponse.json({ error: "Usuario, nombre visible y contraseña son obligatorios." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }

    const client = getAdminClient();
    const { data, error } = await client
      .from("auth_app_users")
      .insert({
        username,
        display_name: displayName,
        password_hash: hashAuthPassword(password),
        role,
        is_active: true,
      })
      .select("id,username,display_name,role,is_active,created_at,updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await registerChangeAudit({
      sessionId: session.sid,
      username: session.username,
      action: "CREATE",
      resource: "auth_app_users",
      details: { id: data.id, username },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown users create error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

