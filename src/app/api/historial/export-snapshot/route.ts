import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import { getConsolidadoDashboard, type ConsolidadoProgram } from "@/lib/consolidado";
import { formatDurationLabel } from "@/lib/duration";
import { sendEmail } from "@/lib/email";
import { buildProfessionalTemplateFromText } from "@/templates/templates.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface HistorialRequest {
  programs: ConsolidadoProgram[];
  generatedAt: string;
}

type SnapshotTrigger = "manual" | "scheduled";

type SnapshotRunOptions = {
  programs?: ConsolidadoProgram[];
  generatedAt?: string;
  trigger?: SnapshotTrigger;
};

type LevelBucket = "tecn" | "pregrado" | "esp" | "espMedQuir" | "maestria" | "doctorado";

type ConsolidadoDocumentoRow = {
  program_id: string;
  name: string | null;
  url: string | null;
};

type StorageFile = {
  name: string;
  created_at?: string;
  updated_at?: string;
  id?: string;
};

type NotificationRecipientRow = {
  email: string;
  is_active: boolean;
};

type AdminClient = SupabaseClient;

const BOGOTA_TIME_ZONE = "America/Bogota";

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/?*\[\]:]/g, " ").trim().slice(0, 31) || "Hoja";
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString("es-CO");
  } catch {
    return date;
  }
}

function formatBogotaDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: BOGOTA_TIME_ZONE,
  }).format(date);
}

function formatRegionalizedForExport(value: unknown): string {
  if (typeof value === "boolean") return value ? "SI" : "NO";

  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "NO";
  if (normalized === "true" || normalized === "si" || normalized === "sí") return "SI";
  if (normalized === "false" || normalized === "no") return "NO";
  if (normalized.includes("ampliacion") || normalized.includes("ampliación")) {
    return "Ampliación de lugar de desarrollo";
  }

  return String(value);
}

function normalizeLevel(program: ConsolidadoProgram): LevelBucket | null {
  const text = `${program.academicLevel ?? ""} ${program.level ?? ""}`.toLowerCase();

  if (text.includes("doctor")) return "doctorado";
  if (text.includes("maestr")) return "maestria";
  if (text.includes("quir")) return "espMedQuir";
  if (text.includes("especial")) return "esp";
  if (text.includes("tecn")) return "tecn";
  if (
    text.includes("pregrado") ||
    text.includes("universit") ||
    text.includes("profesional") ||
    text.includes("licenci") ||
    text.includes("ingenier") ||
    text.includes("arquitect")
  ) {
    return "pregrado";
  }

  return null;
}

function isPregrado(bucket: LevelBucket | null): boolean {
  return bucket === "tecn" || bucket === "pregrado";
}

function isPosgrado(bucket: LevelBucket | null): boolean {
  return bucket === "esp" || bucket === "espMedQuir" || bucket === "maestria" || bucket === "doctorado";
}

function getCellBorder() {
  return {
    top: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
    left: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
    bottom: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
    right: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
  };
}

async function getActiveRecipientEmails(client: AdminClient): Promise<string[]> {
  const { data, error } = await client
    .from("notifications_recipients")
    .select("email,is_active")
    .eq("is_active", true)
    .order("email", { ascending: true });

  if (error) {
    console.error("Error loading notifications_recipients:", error.message);
    return [];
  }

  return ((data ?? []) as NotificationRecipientRow[])
    .map((item) => item.email?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));
}

async function createHistorialExcel(
  programs: ConsolidadoProgram[],
  client: AdminClient,
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema RC AAC";
  workbook.created = new Date();

  const docsByProgram = new Map<string, ConsolidadoDocumentoRow[]>();
  const programIds = programs.map((program) => program.id).filter((id): id is string => Boolean(id));

  if (programIds.length > 0) {
    const { data: docsData, error: docsError } = await client
      .from("consolidado_documentos")
      .select("program_id,name,url")
      .in("program_id", programIds);

    if (docsError) {
      console.error("Error loading consolidado_documentos for historial export:", docsError.message);
    } else {
      for (const doc of (docsData ?? []) as ConsolidadoDocumentoRow[]) {
        const current = docsByProgram.get(doc.program_id) ?? [];
        current.push(doc);
        docsByProgram.set(doc.program_id, current);
      }
    }
  }

  // Sheet 1: BD Completa con TODOS los campos
  const bdSheet = workbook.addWorksheet(sanitizeSheetName("BD Completa"), {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const bdColumns = [
    { key: "processCode", header: "Código Proceso" },
    { key: "faculty", header: "Facultad" },
    { key: "program", header: "Programa" },
    { key: "degree", header: "Título Otorgado" },
    { key: "creationAgreement", header: "Acuerdo Creación" },
    { key: "snies", header: "SNIES" },
    { key: "noRenewal", header: "No Renovación" },
    { key: "authorizedAdmissionsMen", header: "Admitidos MEN" },
    { key: "admissionPeriodicity", header: "Periodicidad Admisión" },
    { key: "agreementCode", header: "Código Convenio" },
    { key: "agreementIes", header: "IES Convenio" },
    { key: "agreementAdministrator", header: "Administrador Convenio" },
    { key: "location", header: "Lugar Desarrollo" },
    { key: "workday", header: "Jornada" },
    { key: "regionalized", header: "Regionalizado" },
    { key: "academicLevel", header: "Nivel Académico" },
    { key: "level", header: "Nivel" },
    { key: "modality", header: "Modalidad" },
    { key: "methodology", header: "Metodología" },
    { key: "researchCredits", header: "Créditos Investigación" },
    { key: "deepeningCredits", header: "Créditos Profundización" },
    { key: "totalAcademicCredits", header: "Total Créditos" },
    { key: "duration", header: "Duración" },
    { key: "reformAcademicCouncil", header: "Reforma Consejo Académico" },
    { key: "reformSuperiorCouncil", header: "Reforma Consejo Superior" },
    { key: "reformMineducacion", header: "Reforma MinEducación" },
    { key: "ticPercentage", header: "% TIC" },
    { key: "hasCurrentRc", header: "Con RC" },
    { key: "rcResolution", header: "Resolución RC" },
    { key: "rcStart", header: "Inicio RC" },
    { key: "rcDurationYears", header: "Duración RC (años)" },
    { key: "rcSiga", header: "SiGA RRC" },
    { key: "rcMineducacion", header: "Plazo Radicación RRC" },
    { key: "rcEnd", header: "Vencimiento RC" },
    { key: "rcExtensionDecree1330", header: "Extensión Decreto 1330" },
    { key: "rcExtensionDecree1174", header: "Extensión Decreto 1174" },
    { key: "rcHistoricalResolutions", header: "Histórico Resoluciones RC" },
    { key: "rcResolutionCount", header: "Cantidad Resoluciones RC" },
    { key: "rcOfficialResolution", header: "Resolución RC Oficio" },
    { key: "rcDeniedResolution", header: "Resolución RC Negada" },
    { key: "numberGraduates", header: "Número Egresados" },
    { key: "acreditable", header: "Acreditable" },
    { key: "accredited", header: "Acreditado" },
    { key: "inAccreditationProcess", header: "En Proceso AAC" },
    { key: "aacResolution", header: "Resolución AAC" },
    { key: "aacStart", header: "Inicio AAC" },
    { key: "aacDurationYears", header: "Duración AAC (años)" },
    { key: "aacCgcaiDelivery", header: "Entrega CGCAI" },
    { key: "aacMineducacionFiling", header: "Plazo Radicación AAC" },
    { key: "aacEnd", header: "Vencimiento AAC" },
    { key: "aacImprovementHalfway", header: "Mitad Vigencia AAC" },
    { key: "aacHistoricalResolutions", header: "Histórico Resoluciones AAC" },
    { key: "aacResolutionCount", header: "Cantidad Resoluciones AAC" },
    { key: "aacDeniedResolution", header: "Resolución AAC Negada" },
    { key: "accreditationGuideline", header: "Lineamiento Acreditación" },
    { key: "generalObservations", header: "Observaciones" },
    { key: "programCoordinator", header: "Coordinador Programa" },
    { key: "programCoordinatorEmail", header: "Email Coordinador" },
    { key: "programCoordinatorTitle", header: "Título Coordinador" },
    { key: "observacionesAlertaRrc", header: "Observaciones Alerta RRC" },
    { key: "observacionesAlertaAcreditados", header: "Observaciones Alerta Acreditados" },
  ];

  bdSheet.columns = bdColumns.map((col) => ({ key: col.key, header: col.header, width: 18 }));

  // Style header
  bdSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = getCellBorder();
  });

  programs.forEach((program, idx) => {
    const row = bdSheet.addRow({
      processCode: program.processCode,
      faculty: program.faculty,
      program: program.program,
      degree: program.degree,
      creationAgreement: program.creationAgreement,
      snies: program.snies,
      noRenewal: program.noRenewal,
      authorizedAdmissionsMen: program.authorizedAdmissionsMen,
      admissionPeriodicity: program.admissionPeriodicity,
      agreementCode: program.agreementCode,
      agreementIes: program.agreementIes,
      agreementAdministrator: program.agreementAdministrator,
      location: program.location || "-",
      workday: program.workday,
      regionalized: formatRegionalizedForExport(program.regionalized),
      academicLevel: program.academicLevel,
      level: program.level,
      modality: program.modality,
      methodology: program.methodology,
      researchCredits: program.researchCredits,
      deepeningCredits: program.deepeningCredits,
      totalAcademicCredits: program.totalAcademicCredits,
      duration: formatDurationLabel(program.duration, program.durationUnit),
      reformAcademicCouncil: program.reformAcademicCouncil,
      reformSuperiorCouncil: program.reformSuperiorCouncil,
      reformMineducacion: program.reformMineducacion,
      ticPercentage: program.ticPercentage,
      hasCurrentRc: program.hasCurrentRc === null ? "" : program.hasCurrentRc ? "Sí" : "No",
      rcResolution: program.rcResolution,
      rcStart: formatDate(program.rcStart),
      rcDurationYears: program.rcDurationYears,
      rcSiga: formatDate(program.rcSiga),
      rcMineducacion: formatDate(program.rcMineducacion),
      rcEnd: formatDate(program.rcEnd),
      rcExtensionDecree1330: formatDate(program.rcExtensionDecree1330),
      rcExtensionDecree1174: formatDate(program.rcExtensionDecree1174),
      rcHistoricalResolutions: program.rcHistoricalResolutions,
      rcResolutionCount: program.rcResolutionCount,
      rcOfficialResolution: program.rcOfficialResolution,
      rcDeniedResolution: program.rcDeniedResolution,
      numberGraduates: program.numberGraduates,
      acreditable: program.acreditable ? "Sí" : "No",
      accredited: program.accredited ? "Sí" : "No",
      inAccreditationProcess: program.inAccreditationProcess ? "Sí" : "No",
      aacResolution: program.aacResolution,
      aacStart: formatDate(program.aacStart),
      aacDurationYears: program.aacDurationYears,
      aacCgcaiDelivery: formatDate(program.aacCgcaiDelivery),
      aacMineducacionFiling: formatDate(program.aacMineducacionFiling),
      aacEnd: formatDate(program.aacEnd),
      aacImprovementHalfway: formatDate(program.aacImprovementHalfway),
      aacHistoricalResolutions: program.aacHistoricalResolutions,
      aacResolutionCount: program.aacResolutionCount,
      aacDeniedResolution: program.aacDeniedResolution,
      accreditationGuideline: program.accreditationGuideline,
      generalObservations: program.generalObservations,
      programCoordinator: program.programCoordinator || "-",
      programCoordinatorEmail: program.programCoordinatorEmail || "-",
      programCoordinatorTitle: program.programCoordinatorTitle || "-",
      observacionesAlertaRrc: program.observacionesAlertaRrc || "-",
      observacionesAlertaAcreditados: program.observacionesAlertaAcreditados || "-",
    });
    const stripeColor = idx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stripeColor } };
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      cell.border = getCellBorder();
    });
  });

  const documentsSheet = workbook.addWorksheet(sanitizeSheetName("Consolidado Documentos"), {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const documentsColumns = [
    { key: "faculty", header: "Facultad", width: 26 },
    { key: "program", header: "Programa", width: 34 },
    { key: "processCode", header: "Código Proceso", width: 16 },
    { key: "documentName", header: "Nombre Archivo", width: 32 },
    { key: "documentLink", header: "Enlace", width: 20 },
  ];

  documentsSheet.columns = documentsColumns;
  documentsSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = getCellBorder();
  });

  let docRowIndex = 0;
  programs.forEach((program) => {
    const docs = docsByProgram.get(program.id) ?? [];
    docs.forEach((doc) => {
      const documentName = doc.name?.trim() || "Documento";
      const row = documentsSheet.addRow({
        faculty: program.faculty,
        program: program.program,
        processCode: program.processCode,
        documentName,
        documentLink: doc.url?.trim() ? "Abrir" : "-",
      });

      if (doc.url?.trim()) {
        row.getCell("documentLink").value = {
          text: documentName,
          hyperlink: doc.url.trim(),
        };
        row.getCell("documentLink").font = {
          color: { argb: "FF2563EB" },
          underline: true,
        };
      }

      const stripeColor = docRowIndex % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stripeColor } };
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
        cell.border = getCellBorder();
      });
      docRowIndex += 1;
    });
  });

  // Sheet 2: Registro Calificado por Programas
  const registroSheet = workbook.addWorksheet(sanitizeSheetName("Registro Programas"), {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const registroColumns = [
    { key: "faculty", header: "Facultad" },
    { key: "program", header: "Programa" },
    { key: "level", header: "Nivel" },
    { key: "tecn", header: "Tecnología" },
    { key: "pregrado", header: "Pregrado" },
    { key: "esp", header: "Especialización" },
    { key: "espMedQuir", header: "Esp. Méd. Quir." },
    { key: "maestria", header: "Maestrías" },
    { key: "doctorado", header: "Doctorado" },
    { key: "totalPregrado", header: "Total Pregrado" },
    { key: "totalPosgrado", header: "Total Posgrado" },
    { key: "total", header: "Total" },
  ];

  registroSheet.columns = registroColumns.map((col) => ({ key: col.key, header: col.header, width: 18 }));
  registroSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = getCellBorder();
  });

  programs.forEach((program, idx) => {
    const bucket = normalizeLevel(program);
    const pregrado = isPregrado(bucket) ? 1 : "";
    const posgrado = isPosgrado(bucket) ? 1 : "";
    const row = registroSheet.addRow({
      faculty: program.faculty,
      program: program.program,
      level: program.academicLevel ?? program.level ?? "-",
      tecn: bucket === "tecn" ? 1 : "",
      pregrado: bucket === "pregrado" ? 1 : "",
      esp: bucket === "esp" ? 1 : "",
      espMedQuir: bucket === "espMedQuir" ? 1 : "",
      maestria: bucket === "maestria" ? 1 : "",
      doctorado: bucket === "doctorado" ? 1 : "",
      totalPregrado: pregrado,
      totalPosgrado: posgrado,
      total: 1,
    });
    const stripeColor = idx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stripeColor } };
      cell.border = getCellBorder();
    });
  });

  // Sheet 3: Acreditación de Programas
  const acreditacionSheet = workbook.addWorksheet(sanitizeSheetName("Acreditación"), {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const acreditacionColumns = [
    { key: "faculty", header: "Facultad" },
    { key: "program", header: "Programa" },
    { key: "acreditable", header: "Acreditable" },
    { key: "accredited", header: "Acreditado" },
    { key: "inProcess", header: "En Proceso" },
    { key: "aacStart", header: "Inicio AAC" },
    { key: "aacEnd", header: "Vencimiento AAC" },
  ];

  acreditacionSheet.columns = acreditacionColumns.map((col) => ({ key: col.key, header: col.header, width: 18 }));
  acreditacionSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = getCellBorder();
  });

  programs.forEach((program, idx) => {
    if (program.acreditable || program.accredited) {
      const row = acreditacionSheet.addRow({
        faculty: program.faculty,
        program: program.program,
        acreditable: program.acreditable ? "Sí" : "No",
        accredited: program.accredited ? "Sí" : "No",
        inProcess: program.inAccreditationProcess ? "Sí" : "No",
        aacStart: formatDate(program.aacStart),
        aacEnd: formatDate(program.aacEnd),
      });
      const stripeColor = idx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stripeColor } };
        cell.border = getCellBorder();
      });
    }
  });

  // Sheet 4: RC Vigencia
  const rcSheet = workbook.addWorksheet(sanitizeSheetName("RC Vigencia"), {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const rcColumns = [
    { key: "faculty", header: "Facultad" },
    { key: "program", header: "Programa" },
    { key: "rcStart", header: "Inicio RC" },
    { key: "rcEnd", header: "Vencimiento RC" },
    { key: "rcStatus", header: "Estado" },
    { key: "rcResolution", header: "Resolución" },
  ];

  rcSheet.columns = rcColumns.map((col) => ({ key: col.key, header: col.header, width: 18 }));
  rcSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = getCellBorder();
  });

  programs.forEach((program, idx) => {
    const rcStatus = program.hasCurrentRc === null ? "Sin definir" : program.hasCurrentRc ? "Vigente" : "Vencido";
    const row = rcSheet.addRow({
      faculty: program.faculty,
      program: program.program,
      rcStart: formatDate(program.rcStart),
      rcEnd: formatDate(program.rcEnd),
      rcStatus,
      rcResolution: program.rcResolution || "-",
    });
    const stripeColor = idx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stripeColor } };
      cell.border = getCellBorder();
    });
  });

  const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
  return buffer;
}

async function resolvePrograms(options?: SnapshotRunOptions): Promise<{ programs: ConsolidadoProgram[]; generatedAt: string }> {
  if (options?.programs && options.programs.length > 0) {
    return {
      programs: options.programs,
      generatedAt: options.generatedAt ?? new Date().toISOString(),
    };
  }

  const dashboard = await getConsolidadoDashboard();
  return {
    programs: dashboard.programs,
    generatedAt: dashboard.generatedAt,
  };
}

export async function runSnapshotExport(options?: SnapshotRunOptions) {
  const { programs, generatedAt } = await resolvePrograms(options);
  if (!programs || programs.length === 0) {
    throw new Error("No hay programas disponibles para generar la instantanea.");
  }

  const client = createClient(supabaseUrl, supabaseServiceKey);
  const excelBuffer = await createHistorialExcel(programs, client);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `snapshot-${timestamp}.xlsx`;

  const { error: uploadError } = await client.storage.from("historicos-database").upload(filename, excelBuffer, {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    cacheControl: "3600",
    upsert: false,
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: publicData } = client.storage.from("historicos-database").getPublicUrl(filename);
  const recipients = await getActiveRecipientEmails(client);

  let emailSent = false;
  let emailError: string | null = null;

  if (recipients.length > 0) {
    try {
      const formattedGeneratedAt = formatBogotaDateTime(generatedAt);
      const subject = `Nueva instantánea BD generada - ${formattedGeneratedAt}`;
      const plainText = [
        "Se ha generado una nueva instantánea de la base de datos.",
        `Archivo: ${filename}`,
        `Fecha: ${formattedGeneratedAt}`,
        `Enlace: ${publicData.publicUrl}`,
      ].join("\n");

      const html = buildProfessionalTemplateFromText({
        subject: "Nueva instantánea de base de datos",
        intro: "Hola equipo,",
        nombreCompleto: "Equipo CGCAI",
        processKeyValue: true,
        text: [
          `Archivo: ${filename}`,
          `Fecha: ${formattedGeneratedAt}`,
          `Destinatarios: ${recipients.length}`,
          `Enlace de descarga: ${publicData.publicUrl}`,
          "",
          "La copia completa se adjunta en este correo.",
        ].join("\n"),
      });

      await sendEmail({
        to: recipients,
        subject,
        text: plainText,
        html,
        audit: {
          source: `snapshot-${options?.trigger ?? "manual"}`,
        },
        attachments: [
          {
            filename,
            content: Buffer.from(excelBuffer),
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        ],
      });
      emailSent = true;
    } catch (error) {
      emailError = error instanceof Error ? error.message : "Unknown email send error";
      console.error("Snapshot email error:", emailError);
    }
  }

  return {
    success: true,
    filename,
    url: publicData.publicUrl,
    timestamp: new Date().toISOString(),
    generatedAt,
    emailSent,
    emailRecipients: recipients.length,
    trigger: options?.trigger ?? "manual",
    ...(emailError ? { emailError } : {}),
  };
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let parsedBody: HistorialRequest | null = null;

    if (rawBody.trim().length > 0) {
      parsedBody = JSON.parse(rawBody) as HistorialRequest;
    }

    const result = await runSnapshotExport({
      programs: Array.isArray(parsedBody?.programs) ? parsedBody?.programs : undefined,
      generatedAt: parsedBody?.generatedAt,
      trigger: "manual",
    });

    return Response.json(result);
  } catch (error) {
    console.error("Export snapshot error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const client = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await client.storage.from("historicos-database").list("", {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const snapshots = ((data ?? []) as StorageFile[])
      .filter((file) => file.name.toLowerCase().endsWith(".xlsx"))
      .map((file) => {
        const { data: publicData } = client.storage.from("historicos-database").getPublicUrl(file.name);
        return {
          filename: file.name,
          url: publicData.publicUrl,
          timestamp: file.created_at ?? file.updated_at ?? new Date().toISOString(),
        };
      });

    return Response.json({ success: true, data: snapshots });
  } catch (error) {
    console.error("List snapshot error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
