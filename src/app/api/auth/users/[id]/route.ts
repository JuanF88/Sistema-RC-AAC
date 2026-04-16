import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { registerChangeAudit } from "@/lib/audit";
import { getSessionFromRequest, hashAuthPassword } from "@/lib/auth";

type UserRole = "administrador" | "usuario" | "visualizador";

type UpdateUserPayload = {
  displayName?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for auth users.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Sesion no valida o expirada." }, { status: 401 });
    if (session.role !== "administrador") return NextResponse.json({ error: "Permisos insuficientes." }, { status: 403 });

    const { id } = await context.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "ID de usuario inválido." }, { status: 400 });
    }

    const payload = (await request.json()) as UpdateUserPayload;

    const updateData: Record<string, unknown> = {};

    if (payload.displayName !== undefined) {
      const displayName = payload.displayName.trim();
      if (!displayName) return NextResponse.json({ error: "El nombre visible no puede ser vacío." }, { status: 400 });
      updateData.display_name = displayName;
    }

    if (payload.role !== undefined) {
      if (!["administrador", "usuario", "visualizador"].includes(payload.role)) {
        return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
      }
      updateData.role = payload.role;
    }

    if (payload.isActive !== undefined) {
      updateData.is_active = Boolean(payload.isActive);
    }

    if (payload.password !== undefined) {
      const pwd = payload.password.trim();
      if (pwd.length < 8) {
        return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
      }
      updateData.password_hash = hashAuthPassword(pwd);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No se enviaron cambios." }, { status: 400 });
    }

    const client = getAdminClient();
    const { data, error } = await client
      .from("auth_app_users")
      .update(updateData)
      .eq("id", id)
      .select("id,username,display_name,role,is_active,created_at,updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await registerChangeAudit({
      sessionId: session.sid,
      username: session.username,
      action: "UPDATE",
      resource: "auth_app_users",
      details: { id },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown users update error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: "Sesion no valida o expirada." }, { status: 401 });
    if (session.role !== "administrador") return NextResponse.json({ error: "Permisos insuficientes." }, { status: 403 });

    const { id } = await context.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "ID de usuario inválido." }, { status: 400 });
    }

    const client = getAdminClient();

    const { data: existingUser, error: fetchError } = await client
      .from("auth_app_users")
      .select("id,username")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 });
    }

    if (!existingUser) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    if (existingUser.username === session.username) {
      return NextResponse.json({ error: "No puedes eliminar tu propio usuario activo." }, { status: 400 });
    }

    const { error: deleteError } = await client.from("auth_app_users").delete().eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    await registerChangeAudit({
      sessionId: session.sid,
      username: session.username,
      action: "DELETE",
      resource: "auth_app_users",
      details: { id, username: existingUser.username },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown users delete error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

