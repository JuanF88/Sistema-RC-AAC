import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { registerChangeAudit } from "@/lib/audit";
import { getSessionFromRequest } from "@/lib/auth";

type HistoricalPayload = {
  label?: string;
  accreditedCount?: number | null;
  accreditableCount?: number | null;
  target25?: number | null;
  target40?: number | null;
  target60?: number | null;
  compliancePercent?: number | null;
  orderIndex?: number;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for accreditation historicos.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Sesion no valida o expirada." }, { status: 401 });
    }
    if (session.role === "visualizador") {
      return NextResponse.json({ error: "Tu rol no permite modificar datos." }, { status: 403 });
    }

    const { id } = await context.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Invalid historico ID format" }, { status: 400 });
    }

    const payload = (await request.json()) as HistoricalPayload;
    const updateData = {
      ...(payload.label !== undefined ? { label: payload.label } : {}),
      ...(payload.accreditedCount !== undefined ? { accredited_count: payload.accreditedCount } : {}),
      ...(payload.accreditableCount !== undefined ? { accreditable_count: payload.accreditableCount } : {}),
      ...(payload.target25 !== undefined ? { target_25: payload.target25 } : {}),
      ...(payload.target40 !== undefined ? { target_40: payload.target40 } : {}),
      ...(payload.target60 !== undefined ? { target_60: payload.target60 } : {}),
      ...(payload.compliancePercent !== undefined ? { compliance_percent: payload.compliancePercent } : {}),
      ...(payload.orderIndex !== undefined ? { order_index: payload.orderIndex } : {}),
    };

    const client = getAdminClient();
    const { data, error } = await client
      .from("acreditacion_historicos")
      .update(updateData)
      .eq("id", id)
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await registerChangeAudit({
      sessionId: session.sid,
      username: session.username,
      action: "UPDATE",
      resource: "acreditacion_historicos",
      details: { id },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown historicos update error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Sesion no valida o expirada." }, { status: 401 });
    }
    if (session.role === "visualizador") {
      return NextResponse.json({ error: "Tu rol no permite modificar datos." }, { status: 403 });
    }

    const { id } = await context.params;
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Invalid historico ID format" }, { status: 400 });
    }

    const client = getAdminClient();
    const { error } = await client.from("acreditacion_historicos").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await registerChangeAudit({
      sessionId: session.sid,
      username: session.username,
      action: "DELETE",
      resource: "acreditacion_historicos",
      details: { id },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown historicos delete error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
