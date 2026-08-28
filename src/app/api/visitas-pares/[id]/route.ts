import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { registerChangeAudit } from "@/lib/audit";
import { getSessionFromRequest } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for visitas de pares.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

type VisitaParPayload = {
  program: string;
  startDate: string;
  endDate: string;
  subject: string;
  modality: string;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Sesión no válida o expirada." }, { status: 401 });
    }
    if (session.role === "visualizador") {
      return NextResponse.json({ error: "Tu rol no permite modificar datos." }, { status: 403 });
    }

    const { id } = await context.params;

    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Invalid visita ID format" }, { status: 400 });
    }

    const payload = (await request.json()) as VisitaParPayload;

    const program = payload.program?.trim() ?? "";
    const subject = payload.subject?.trim() ?? "";
    const startDate = payload.startDate?.trim() ?? "";
    const endDate = payload.endDate?.trim() ?? "";
    const modality = payload.modality?.trim() ?? "";

    // Mismas reglas que al crear: la visita siempre queda completa y con las
    // fechas en orden, sin importar por cual de los dos caminos se guardo.
    if (!program || !subject || !startDate || !endDate || !modality) {
      return NextResponse.json({ error: "Todos los campos son obligatorios para editar la visita." }, { status: 400 });
    }

    if (endDate < startDate) {
      return NextResponse.json({ error: "La fecha final no puede ser anterior a la fecha de inicio." }, { status: 400 });
    }

    const client = getAdminClient();
    const { data, error } = await client
      .from("visitas_pares")
      .update({
        program,
        start_date: startDate,
        end_date: endDate,
        subject,
        modality,
      })
      .eq("id", id)
      .select("id,program,start_date,end_date,subject,modality")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await registerChangeAudit({
      sessionId: session.sid,
      username: session.username,
      action: "UPDATE",
      resource: "visitas_pares",
      details: { id, program },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown visitas update error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Sesión no válida o expirada." }, { status: 401 });
    }
    if (session.role === "visualizador") {
      return NextResponse.json({ error: "Tu rol no permite modificar datos." }, { status: 403 });
    }

    const { id } = await context.params;

    if (!isValidUuid(id)) {
      return NextResponse.json({ error: "Invalid visita ID format" }, { status: 400 });
    }

    const client = getAdminClient();
    const { error } = await client.from("visitas_pares").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await registerChangeAudit({
      sessionId: session.sid,
      username: session.username,
      action: "DELETE",
      resource: "visitas_pares",
      details: { id },
    }).catch(() => undefined);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown visitas delete error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

