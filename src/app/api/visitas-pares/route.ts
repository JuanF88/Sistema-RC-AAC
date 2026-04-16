import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { registerChangeAudit } from "@/lib/audit";
import { getSessionFromRequest } from "@/lib/auth";

type VisitaParPayload = {
  program: string;
  startDate: string;
  endDate: string;
  subject: string;
  modality: string;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for visitas de pares.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from("visitas_pares")
      .select("id,program,start_date,end_date,subject,modality")
      .order("start_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown visitas read error";
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

    const payload = (await request.json()) as VisitaParPayload;

    const program = payload.program?.trim() ?? "";
    const subject = payload.subject?.trim() ?? "";
    const startDate = payload.startDate?.trim() ?? "";
    const endDate = payload.endDate?.trim() ?? "";
    const modality = payload.modality?.trim() ?? "";

    if (!program || !subject || !startDate || !endDate || !modality) {
      return NextResponse.json({ error: "Todos los campos son obligatorios para registrar la visita." }, { status: 400 });
    }

    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      return NextResponse.json({ error: "La fecha final no puede ser anterior a la fecha de inicio." }, { status: 400 });
    }

    const client = getAdminClient();
    const { data, error } = await client
      .from("visitas_pares")
      .insert({
        program,
        start_date: startDate,
        end_date: endDate,
        subject,
        modality,
      })
      .select("id,program,start_date,end_date,subject,modality")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await registerChangeAudit({
      sessionId: session.sid,
      username: session.username,
      action: "CREATE",
      resource: "visitas_pares",
      details: { id: data.id, program },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown visitas create error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

