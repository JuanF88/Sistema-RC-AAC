import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { registerChangeAudit } from "@/lib/audit";
import { getSessionFromRequest } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ programId: string }>;
};

type UpdateEstadoPayload = {
  estado?: string;
};

const ESTADO_OPTIONS = [
  "Renovaciones",
  "En proceso renovación",
  "Nuevos",
  "En proceso de AAC",
  "Acreditado a 2026",
] as const;

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for acreditacion estados.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Sesion no valida o expirada." }, { status: 401 });
    }
    if (session.role === "visualizador") {
      return NextResponse.json({ error: "Tu rol no permite modificar datos." }, { status: 403 });
    }

    const { programId } = await context.params;
    const payload = (await request.json()) as UpdateEstadoPayload;
    const estado = payload.estado?.trim();

    if (!programId) {
      return NextResponse.json({ error: "Se requiere programId." }, { status: 400 });
    }

    if (!estado || !ESTADO_OPTIONS.includes(estado as (typeof ESTADO_OPTIONS)[number])) {
      return NextResponse.json({ error: "Estado invalido para acreditacion." }, { status: 400 });
    }

    const client = getAdminClient();
    const { data, error } = await client
      .from("acreditacion_estados_programa")
      .upsert(
        {
          program_id: programId,
          estado,
        },
        { onConflict: "program_id" },
      )
      .select("program_id,estado")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await registerChangeAudit({
      sessionId: session.sid,
      username: session.username,
      action: "UPDATE",
      resource: "acreditacion_estados_programa",
      details: { programId, estado },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown accreditation estado update error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
