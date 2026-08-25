import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionFromRequest } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { collectManagerEmails, findFacultyManagers } from "@/lib/qualityManagers";
import { buildAlertTemplate } from "@/templates/templates.js";
import {
  DELIVERY_FIRST_REMINDER_MONTHS,
  DELIVERY_REMINDER_MONTHS,
  monthsLabel,
  monthsStageLabel,
  remainingMonthsPhrase,
} from "@/lib/alertSchedule";

type AlertType = "rrc" | "aac";
type AlertKind = "inicio" | "recordatorio" | "entrega";

type SendAlertPayload = {
  programId: string;
  alertType: AlertType;
  alertKind: AlertKind;
  manualOnly?: boolean;
  // Devuelve el correo ya armado sin enviarlo ni registrarlo, para revisarlo
  // antes de confirmar el envio.
  preview?: boolean;
};

type ProgramRow = {
  id: string;
  program: string | null;
  faculty: string | null;
  program_coordinator: string | null;
  program_coordinator_email: string | null;
  rc_end: string | null;
  rc_siga: string | null;
  aac_end: string | null;
  aac_cgcai_delivery: string | null;
};

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  rrc: "Registro Calificado",
  aac: "Acreditación",
};

const ALERT_KIND_LABELS: Record<AlertKind, string> = {
  inicio: "Inicio de renovación",
  recordatorio: "Recordatorio previo a entrega",
  entrega: "Recordatorio de entrega",
};

// Nombre del proceso tal como se muestra en la fila "Proceso" del correo.
const PROCESS_NAMES: Record<AlertType, string> = {
  rrc: "Renovación del Registro Calificado",
  aac: "Renovación de la Acreditación en Alta Calidad",
};

// Nombre largo del proceso, con artículo, para usarlo dentro de frases.
const PROCESS_PHRASES: Record<AlertType, string> = {
  rrc: "del Registro Calificado",
  aac: "de la Acreditación en Alta Calidad",
};

// Entidad receptora de la documentación, ya contraída con la preposición
// ("al Centro...") para que las frases queden bien construidas.
// Los dos procesos se entregan al CGCAI.
const DELIVERY_TARGETS: Record<AlertType, string> = {
  rrc: "al Centro de Gestión de la Calidad y la Acreditación Institucional",
  aac: "al Centro de Gestión de la Calidad y la Acreditación Institucional",
};

// Párrafo de cierre común a las tres etapas.
function buildDeliveryClosingParagraph(deliveryTarget: string): string {
  return `La documentación deberá ser entregada por el programa al CGCAI dentro del plazo establecido, para su correspondiente revisión y posterior trámite ante el Ministerio de Educación Nacional.`;
}

type AlertStageContext = {
  processPhrase: string;
  deliveryTarget: string;
};

type AlertStage = {
  /** Etiqueta del pill del encabezado, sin el prefijo "Alerta | ". */
  badge: string;
  /** Titular blanco del encabezado. */
  title: (context: AlertStageContext) => string;
  /** Valor de la fila "Etapa" de la tabla. */
  stageLabel: string;
  /** Bloque "¿Qué debe hacer el programa?". */
  instructions: (context: AlertStageContext) => string;
  /** Cada alerta usa su propio degradado y escala de titular. */
  gradientFrom: string;
  gradientTo: string;
  titleSize: number;
  headerPadding: string;
};

// Una entrada por etapa: lo único que cambia entre alertas es el contenido de
// estos campos. La estructura visual (tabla, información importante, contacto,
// pie) es común y vive en buildAlertTemplate.
const ALERT_STAGES: Record<AlertKind, AlertStage> = {
  inicio: {
    badge: "Inicio de renovación",
    title: ({ processPhrase }) => `Inicio del proceso de renovación ${processPhrase}`,
    stageLabel: "Inicio del proceso de renovación",
    instructions: ({ processPhrase, deliveryTarget }) =>
      `A partir de esta notificación, se debe iniciar el proceso de autoevaluación y la preparación de la documentación requerida para la renovación ${processPhrase}.\n\n${buildDeliveryClosingParagraph(deliveryTarget)}`,
    gradientFrom: "#f15a3c",
    gradientTo: "#f5a623",
    titleSize: 27,
    headerPadding: "30px 28px 34px",
  },
  recordatorio: {
    // Alerta preventiva: enfatiza revisar el avance, completar y organizar.
    badge: `${monthsLabel(DELIVERY_FIRST_REMINDER_MONTHS)} para la fecha límite`,
    title: ({ processPhrase }) =>
      `${remainingMonthsPhrase(DELIVERY_FIRST_REMINDER_MONTHS)} para entregar la documentación de renovación ${processPhrase}`,
    stageLabel: monthsStageLabel(DELIVERY_FIRST_REMINDER_MONTHS),
    instructions: ({ deliveryTarget }) =>
      `${remainingMonthsPhrase(DELIVERY_FIRST_REMINDER_MONTHS)} para la fecha límite de entrega de la documentación. En este momento, el programa debe verificar el avance del proceso de autoevaluación, completar la información requerida y asegurar que la documentación se encuentre organizada para su entrega dentro del plazo establecido.\n\n${buildDeliveryClosingParagraph(deliveryTarget)}`,
    gradientFrom: "#ff6a00",
    gradientTo: "#ffa800",
    titleSize: 29,
    headerPadding: "34px 28px 38px",
  },
  entrega: {
    // Alerta final: enfatiza finalizar, verificar y entregar.
    badge: `${monthsLabel(DELIVERY_REMINDER_MONTHS)} para la fecha límite`,
    title: ({ processPhrase }) =>
      `${remainingMonthsPhrase(DELIVERY_REMINDER_MONTHS)} para entregar la documentación de la renovación ${processPhrase}`,
    stageLabel: "Etapa final de preparación y entrega",
    instructions: ({ deliveryTarget }) =>
      `${remainingMonthsPhrase(DELIVERY_REMINDER_MONTHS)} para la fecha límite de entrega de la documentación. En este momento, el programa debe finalizar la preparación de la información, verificar que la documentación requerida esté completa y realizar su entrega ${deliveryTarget} dentro del plazo establecido.\n\n${buildDeliveryClosingParagraph(deliveryTarget)}`,
    gradientFrom: "#f57c00",
    gradientTo: "#ffb300",
    titleSize: 29,
    headerPadding: "34px 28px 38px",
  },
};

const DELIVERY_DATE_LABELS: Record<AlertType, string> = {
  rrc: "Fecha límite de entrega al CGCAI",
  aac: "Fecha límite de entrega al CGCAI",
};

const EXPIRATION_DATE_LABELS: Record<AlertType, string> = {
  rrc: "Fecha de vencimiento del Registro Calificado",
  aac: "Fecha de vencimiento de la acreditación",
};

const CONTACT_EMAIL = process.env.ALERTS_CONTACT_EMAIL?.trim() || "acredigral@unicauca.edu.co";

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

// Gestores de calidad activos de la facultad del programa. Se nombran todos y
// se copia a todos sus correos institucionales; el personal se guarda en el
// directorio como dato de contacto, no como canal de notificacion. Si la tabla
// todavia no existe o la consulta falla, la alerta se envia igual sin copia: el
// correo al coordinador es lo que no puede perderse.
async function loadFacultyManagers(
  client: ReturnType<typeof getAdminClient>,
  faculty: string | null,
): Promise<{ names: string[]; emails: string[] }> {
  const { data, error } = await client
    .from("gestores_calidad")
    .select("faculty, full_name, institutional_email")
    .eq("is_active", true);

  if (error) {
    console.error("No se pudieron cargar los gestores de calidad:", error.message);
    return { names: [], emails: [] };
  }

  const managers = findFacultyManagers(data ?? [], faculty);
  const names = managers
    .map((manager) => manager.full_name?.trim() ?? "")
    .filter((name) => name.length > 0);

  return { names, emails: collectManagerEmails(managers) };
}

// Las fechas se guardan como "YYYY-MM-DD" sin hora. Al pasarlas por new Date()
// se interpretan como medianoche UTC y toLocaleDateString las convierte a la
// zona del servidor: en Colombia (UTC-5) eso restaba un dia y el correo anunciaba
// una fecha limite anterior a la registrada. Se formatea a partir del texto para
// que el resultado no dependa de la zona horaria donde corra la aplicacion.
function formatDate(value: string | null): string {
  if (!value) return "-";
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "-";
  return `${match[3]}/${match[2]}/${match[1]}`;
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
      .select("id, program_id, alert_type, alert_kind, cycle_date, sent_at, actor_username, recipients")
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
      return NextResponse.json({ error: "Sesión no válida o expirada." }, { status: 401 });
    }
    if (session.role === "visualizador") {
      return NextResponse.json({ error: "Tu rol no permite enviar correos." }, { status: 403 });
    }

    const payload = (await request.json()) as SendAlertPayload;
    if (!payload.programId || !isValidAlertType(payload.alertType) || !isValidAlertKind(payload.alertKind)) {
      return NextResponse.json({ error: "Datos de alerta inválidos." }, { status: 400 });
    }

    const client = getAdminClient();
    const { data: program, error } = await client
      .from("consolidado_programas")
      .select(
        "id, program, faculty, program_coordinator, program_coordinator_email, rc_end, rc_siga, aac_end, aac_cgcai_delivery",
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

    // El gestor de calidad de la facultad acompana el proceso, asi que recibe
    // copia de la alerta. Se descartan los correos que ya estan en el
    // destinatario principal para no duplicar el envio.
    const managers = await loadFacultyManagers(client, record.faculty ?? null);
    const ccRecipients = managers.emails.filter(
      (email) => !recipients.some((item) => item.toLowerCase() === email.toLowerCase()),
    );

    const alertTypeLabel = ALERT_TYPE_LABELS[payload.alertType];
    const alertKindLabel = ALERT_KIND_LABELS[payload.alertKind];
    const programName = record.program ?? "Programa";
    const subject = `${alertKindLabel} - ${alertTypeLabel} - ${programName}`;

    const expirationDate = payload.alertType === "rrc" ? record.rc_end : record.aac_end;
    const deliveryDate = payload.alertType === "rrc" ? record.rc_siga : record.aac_cgcai_delivery;

    const stage = ALERT_STAGES[payload.alertKind];
    const stageContext = {
      processPhrase: PROCESS_PHRASES[payload.alertType],
      deliveryTarget: DELIVERY_TARGETS[payload.alertType],
    };
    const coordinatorName = record.program_coordinator?.trim() || "";
    // El saludo es generico a proposito: el nombre del coordinador se muestra
    // dentro de la tabla "Informacion del proceso", no en el encabezado.
    const recipientName = "Estimado(a) coordinador(a)";

    const alertTitle = stage.title(stageContext);
    const explanation = `Esta alerta se genera en el marco del seguimiento que realiza el Centro de Gestión de la Calidad y la Acreditación Institucional (CGCAI) al proceso de renovación ${stageContext.processPhrase} de los programas académicos de la Universidad.`;
    const instructions = stage.instructions(stageContext);
    const accreditationNote =
      "Si el programa se encuentra acreditado y cumple con los tiempos establecidos para la renovación de la Acreditación en Alta Calidad, no tendrá que realizar el trámite de renovación del Registro Calificado.";
    const contactText =
      "Para resolver inquietudes o realizar el envío de la información correspondiente al proceso, puede escribir al correo electrónico";

    const details = [
      { label: "Programa", value: programName },
      { label: "Proceso", value: PROCESS_NAMES[payload.alertType] },
      { label: "Asunto", value: stage.stageLabel },
      { label: EXPIRATION_DATE_LABELS[payload.alertType], value: formatDate(expirationDate) },
      { label: DELIVERY_DATE_LABELS[payload.alertType], value: formatDate(deliveryDate) },
      { label: "Coordinador(a)", value: coordinatorName || "-" },
      // La fila del gestor solo aparece cuando la facultad tiene alguno
      // asignado, para que el correo no muestre un campo vacio. Si hay varios,
      // se nombran todos.
      ...(managers.names.length > 0
        ? [
            {
              label: managers.names.length > 1 ? "Gestores de calidad" : "Gestor(a) de calidad",
              value: managers.names.join("; "),
            },
          ]
        : []),
    ];

    const plainText = [
      `${recipientName}:`,
      "",
      explanation,
      "",
      "Información del proceso",
      ...details.map((item) => `${item.label}: ${item.value}`),
      "",
      "¿Qué debe hacer el programa?",
      instructions,
      "",
      "Información importante",
      accreditationNote,
      "",
      `${contactText} ${CONTACT_EMAIL}.`,
      "",
      "Este es un mensaje automático. Por favor, no responda a este correo.",
    ].join("\n");

    const html = buildAlertTemplate({
      alertBadge: `Alerta | ${stage.badge}`,
      title: alertTitle,
      programName,
      recipientName,
      introText: explanation,
      detailsTitle: "Información del proceso",
      details,
      actionTitle: "¿Qué debe hacer el programa?",
      actionText: instructions,
      importantTitle: "Información importante",
      importantText: accreditationNote,
      contactText,
      contactEmail: CONTACT_EMAIL,
      gradientFrom: stage.gradientFrom,
      gradientTo: stage.gradientTo,
      titleSize: stage.titleSize,
      headerPadding: stage.headerPadding,
    });

    // La previsualizacion corta aqui: el correo ya esta armado con los mismos
    // datos del envio real, pero no sale nada ni queda registrado en el
    // historial. Asi lo que se revisa es exactamente lo que se enviaria.
    if (payload.preview) {
      return NextResponse.json({
        data: {
          subject,
          to: recipients,
          cc: ccRecipients,
          html,
          text: plainText,
        },
      });
    }

    if (!payload.manualOnly) {
      await sendEmail({
        to: recipients,
        cc: ccRecipients.length > 0 ? ccRecipients : undefined,
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
        // Ciclo al que pertenece el envio: si el programa renueva y cambia su
        // fecha de vencimiento, las alertas del ciclo siguiente se rehabilitan.
        cycle_date: expirationDate ? expirationDate.slice(0, 10) : null,
        sent_at: new Date().toISOString(),
        actor_username: session.username,
        recipients,
      })
      .select("id, program_id, alert_type, alert_kind, cycle_date, sent_at, actor_username, recipients")
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
