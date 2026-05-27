import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionFromRequest } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { buildProfessionalTemplateFromText } from "@/templates/templates.js";

type AlertType = "rrc" | "aac";
type AlertKind = "inicio" | "recordatorio" | "entrega";

type SendAlertPayload = {
  programId: string;
  alertType: AlertType;
  alertKind: AlertKind;
  manualOnly?: boolean;
};

type ProgramRow = {
  id: string;
  program: string | null;
  program_coordinator: string | null;
  program_coordinator_email: string | null;
  rc_end: string | null;
  rc_siga: string | null;
  aac_end: string | null;
  aac_cgcai_delivery: string | null;
};

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  rrc: "Registro Calificado",
  aac: "Acreditacion",
};

const ALERT_KIND_LABELS: Record<AlertKind, string> = {
  inicio: "Inicio de renovacion",
  recordatorio: "Recordatorio previo a entrega",
  entrega: "Recordatorio de entrega",
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables for admin updates.");
  }

  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function parseCoordinatorEmails(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[;\n,]+/)
    .map((email) => email.trim())
    .filter((email) => email.length > 0);
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-CO");
}

function isValidAlertType(value: string): value is AlertType {
  return value === "rrc" || value === "aac";
}

function isValidAlertKind(value: string): value is AlertKind {
  return value === "inicio" || value === "recordatorio" || value === "entrega";
}

export async function GET() {
  try {
    const client = getAdminClient();
    const { data, error } = await client
      .from("notifications_alertas_envios")
      .select("id, program_id, alert_type, alert_kind, sent_at, actor_username, recipients")
      .order("sent_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown alert history error";
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
      return NextResponse.json({ error: "Tu rol no permite enviar correos." }, { status: 403 });
    }

    const payload = (await request.json()) as SendAlertPayload;
    if (!payload.programId || !isValidAlertType(payload.alertType) || !isValidAlertKind(payload.alertKind)) {
      return NextResponse.json({ error: "Datos de alerta invalidos." }, { status: 400 });
    }

    const client = getAdminClient();
    const { data: program, error } = await client
      .from("consolidado_programas")
      .select(
        "id, program, program_coordinator, program_coordinator_email, rc_end, rc_siga, aac_end, aac_cgcai_delivery",
      )
      .eq("id", payload.programId)
      .single();

    if (error || !program) {
      return NextResponse.json({ error: error?.message ?? "Programa no encontrado." }, { status: 404 });
    }

    const record = program as ProgramRow;
    const recipients = parseCoordinatorEmails(record.program_coordinator_email ?? null);
    if (!payload.manualOnly && recipients.length === 0) {
      return NextResponse.json({ error: "El programa no tiene correo de coordinador." }, { status: 400 });
    }

    const alertTypeLabel = ALERT_TYPE_LABELS[payload.alertType];
    const alertKindLabel = ALERT_KIND_LABELS[payload.alertKind];
    const programName = record.program ?? "Programa";
    const subject = `${alertKindLabel} - ${alertTypeLabel} - ${programName}`;

    const expirationDate = payload.alertType === "rrc" ? record.rc_end : record.aac_end;
    const deliveryDate = payload.alertType === "rrc" ? record.rc_siga : record.aac_cgcai_delivery;

    const textLines = [
      `Programa: ${programName}`,
      `Tipo de alerta: ${alertTypeLabel}`,
      `Motivo: ${alertKindLabel}`,
      `Fecha vencimiento: ${formatDate(expirationDate)}`,
      `Fecha entrega: ${formatDate(deliveryDate)}`,
      `Coordinador: ${record.program_coordinator ?? "-"}`,
    ];

    const explanation = `Te contactamos para el seguimiento del ${alertTypeLabel} del programa ${programName}. A continuacion encuentras las fechas clave y el motivo de esta alerta.`;
    const accreditationNote = "Si el programa esta acreditado y cumple con los tiempos de renovacion, no tendra que realizar el tramite de renovacion de registro de este programa.";

    const plainText = [
      `Hola ${record.program_coordinator ?? "equipo"},`,
      "",
      explanation,
      "",
      ...textLines,
      "",
      "Este es un recordatorio oficial enviado desde el Sistema Orbita.",
      accreditationNote,
    ].join("\n");

    const html = buildProfessionalTemplateFromText({
      subject,
      intro: `Hola ${record.program_coordinator ?? "equipo"},`,
      nombreCompleto: record.program_coordinator ?? undefined,
      keyValueText: textLines.join("\n"),
      text: `${explanation}\n\nEste es un recordatorio oficial enviado desde el Sistema Orbita.\n${accreditationNote}`,
    });

    if (!payload.manualOnly) {
      await sendEmail({
        to: recipients,
        subject,
        text: plainText,
        html,
        audit: {
          source: `alerta-${payload.alertType}-${payload.alertKind}`,
          actorUsername: session.username,
        },
      });
    }

    const { error: insertError, data: insertData } = await client
      .from("notifications_alertas_envios")
      .insert({
        program_id: payload.programId,
        alert_type: payload.alertType,
        alert_kind: payload.alertKind,
        sent_at: new Date().toISOString(),
        actor_username: session.username,
        recipients,
      })
      .select("id, program_id, alert_type, alert_kind, sent_at, actor_username, recipients")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: insertData });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown send alert error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
