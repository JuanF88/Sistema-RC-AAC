import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { registerChangeAudit } from "@/lib/audit";
import { getSessionFromRequest } from "@/lib/auth";

type HistoricalPayload = {
  label: string;
  accreditedCount?: number | null;
  accreditableCount?: number | null;
  target25?: number | null;
  target40?: number | null;
  target60?: number | null;
  compliancePercent?: number | null;
  orderIndex?: number;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for accreditation historicos.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function mapPayload(payload: HistoricalPayload) {
  return {
    label: payload.label,
    accredited_count: payload.accreditedCount ?? null,
    accreditable_count: payload.accreditableCount ?? null,
    target_25: payload.target25 ?? null,
    target_40: payload.target40 ?? null,
    target_60: payload.target60 ?? null,
    compliance_percent: payload.compliancePercent ?? null,
    order_index: payload.orderIndex ?? 0,
  };
}

export async function GET() {
  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from("acreditacion_historicos")
      .select("id,label,accredited_count,accreditable_count,target_25,target_40,target_60,compliance_percent,order_index")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown historicos read error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Sesion no valida o expirada." }, { status: 401 });
    }
    if (session.role === "visualizador") {
      return NextResponse.json({ error: "Tu rol no permite modificar datos." }, { status: 403 });
    }

    const payload = (await request.json()) as HistoricalPayload;

    if (!payload.label?.trim()) {
      return NextResponse.json({ error: "El campo label es obligatorio." }, { status: 400 });
    }

    const client = getAdminClient();
    const { data, error } = await client
      .from("acreditacion_historicos")
      .insert(mapPayload(payload))
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await registerChangeAudit({
      sessionId: session.sid,
      username: session.username,
      action: "CREATE",
      resource: "acreditacion_historicos",
      details: { id: data.id, label: payload.label },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown historicos create error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

