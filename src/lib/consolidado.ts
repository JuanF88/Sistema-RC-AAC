import fs from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { parseDurationFromValue } from "@/lib/duration";
import { normalizeMethodology } from "@/lib/methodology";

export type ConsolidadoProgram = {
  regionalized: "Si" | "No" | "Ampliación de lugar de desarrollo";
  id: string;
  documentCount: number;
  isActive: boolean;
  
  // Basic Program Information
  processCode: string;
  faculty: string;
  program: string;
  degree: string | null;
  snies: string | null;

  // Administrative Details
  creationAgreement: string | null;
  noRenewal: string | null;
  authorizedAdmissionsMen: number | null;
  admissionPeriodicity: string | null;
  agreementCode: string | null;
  agreementIes: string | null;
  agreementAdministrator: string | null;

  // Location and Format
  location: string | null;
  workday: string | null;
  level: string | null;
  academicLevel: string | null;
  modality: string | null;
  methodology: string | null;

  // Academic Credits
  researchCredits: number | null;
  deepeningCredits: number | null;
  totalAcademicCredits: number | null;
  duration: number | null;
  durationUnit: "Semestres" | "Años" | null;

  // Reforms
  reformAcademicCouncil: string | null;
  reformSuperiorCouncil: string | null;
  reformMineducacion: string | null;
  ticPercentage: number | null;

  // Current R.C. (Registro de Calificación)
  hasCurrentRc: boolean | null;
  rcResolution: string | null;
  rcStart: string | null;
  rcDurationYears: number | null;
  rcSiga: string | null;
  rcMineducacion: string | null;
  rcEnd: string | null;
  rcExtensionDecree1330: string | null;
  rcExtensionDecree1174: string | null;
  rcHistoricalResolutions: string | null;
  rcResolutionCount: number | null;
  rcOfficialResolution: string | null;
  rcDeniedResolution: string | null;

  // Graduates
  numberGraduates: number | null;

  // Accreditation (A.A.C.)
  acreditable: boolean;
  accredited: boolean;
  inAccreditationProcess: boolean;
  aacResolution: string | null;
  aacStart: string | null;
  aacDurationYears: number | null;
  aacCgcaiDelivery: string | null;
  aacMineducacionFiling: string | null;
  aacEnd: string | null;
  aacImprovementHalfway: string | null;
  aacHistoricalResolutions: string | null;
  aacResolutionCount: number | null;
  aacDeniedResolution: string | null;

  // Notes and Metadata
  accreditationGuideline: string | null;
  generalObservations: string | null;
  programCoordinator: string | null;
  programCoordinatorEmail: string | null;
  programCoordinatorTitle: string | null;
  observacionesAlertaRrc: string | null;
  observacionesAlertaAcreditados: string | null;
  source: "supabase" | "excel";
};

export type ConsolidadoDashboard = {
  source: "supabase" | "excel";
  generatedAt: string;
  summary: {
    totalPrograms: number;
    faculties: number;
    activeRc: number;
    expiredRc: number;
    accredited: number;
    inAacProcess: number;
    upcomingRrcIn120Days: number;
  };
  byFaculty: Array<{
    faculty: string;
    programs: number;
    activeRc: number;
    accredited: number;
  }>;
  programs: ConsolidadoProgram[];
};

function addMonths(isoDate: string | null, months: number): string | null {
  if (!isoDate || !Number.isFinite(months)) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function toIsoFromParts(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toIsoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toIsoFromParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const wholeDays = Math.trunc(value);
    const date = new Date(excelEpoch.getTime() + wholeDays * 24 * 60 * 60 * 1000);
    if (!Number.isNaN(date.getTime())) {
      return toIsoFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    }
  }

  if (typeof value === "string") {
    const clean = value.trim();
    if (!clean) return null;

    const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return clean;

    const direct = new Date(clean);
    if (!Number.isNaN(direct.getTime())) {
      return toIsoFromParts(direct.getFullYear(), direct.getMonth() + 1, direct.getDate());
    }

    const latinDate = clean.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
    if (latinDate) {
      const day = Number(latinDate[1]);
      const month = Number(latinDate[2]);
      const year = Number(latinDate[3].length === 2 ? `20${latinDate[3]}` : latinDate[3]);
      const dt = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isNaN(dt.getTime())) {
        return dt.toISOString().slice(0, 10);
      }
    }
  }

  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, ".").match(/-?\d+(\.\d+)?/);
    if (!cleaned) return null;
    const parsed = Number(cleaned[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toYesNo(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized === "si" || normalized === "sí" || normalized === "yes" || normalized === "true";
}

function normalizeRegionalized(value: unknown): "Si" | "No" | "Ampliación de lugar de desarrollo" {
  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }

  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "No";

  if (
    normalized.includes("ampliacion") ||
    normalized.includes("ampliación") ||
    normalized.includes("ampliacion de lugar") ||
    normalized.includes("ampliación de lugar")
  ) {
    return "Ampliación de lugar de desarrollo";
  }

  if (normalized === "si" || normalized === "sí" || normalized === "yes" || normalized === "true") {
    return "Si";
  }

  if (normalized === "no" || normalized === "false") {
    return "No";
  }

  return "No";
}

function isFuture(isoDate: string | null): boolean | null {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return date.getTime() > now.getTime();
}

function daysUntil(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffMs = date.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getFirst(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return null;
}

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) return null;

  const authKey = serviceRoleKey || anonKey;
  if (!authKey) return null;

  return createClient(supabaseUrl, authKey, {
    auth: { persistSession: false },
  });
}

function mapSupabaseRow(raw: Record<string, unknown>): ConsolidadoProgram | null {
  const program = String(getFirst(raw, ["program", "programa", "nombre_programa", "name"]) ?? "").trim();
  const faculty = String(getFirst(raw, ["faculty", "facultad", "nombre_facultad"]) ?? "").trim();
  if (!program || !faculty) return null;

  const rcStart = toIsoDate(getFirst(raw, ["rc_start", "inicio_rc", "inicio_r_c", "inicio_rc_date"]));
  const rcDurationYears = toNumber(
    getFirst(raw, ["rc_duration_years", "duracion_rc", "duracion_rc_anios", "duracion_anios_rc"]),
  );
  const rcEnd =
    toIsoDate(getFirst(raw, ["rc_end", "vencimiento_rc", "fin_rc", "vencimiento_r_c"])) ??
    addMonths(rcStart, (rcDurationYears ?? 0) * 12);

  const rcSiga =
    toIsoDate(getFirst(raw, ["rc_siga", "siga_rrc", "fecha_siga_rrc"])) ??
    addMonths(rcStart, (rcDurationYears ?? 0) * 12 - 14);

  const rcMineducacion =
    toIsoDate(getFirst(raw, ["rc_mineducacion", "plazo_radicacion_rrc", "rrc_min"])) ??
    addMonths(rcStart, (rcDurationYears ?? 0) * 12 - 12);

  const aacStart = toIsoDate(getFirst(raw, ["aac_start", "inicio_aac", "inicio_acreditacion"]));
  const aacDurationYears = toNumber(getFirst(raw, ["aac_duration_years", "duracion_aac", "duracion_aac_anios"]));
  const aacEnd =
    toIsoDate(getFirst(raw, ["aac_end", "vencimiento_aac", "fin_aac"])) ??
    addMonths(aacStart, (aacDurationYears ?? 0) * 12);

  const aacImprovementHalfway =
    toIsoDate(getFirst(raw, ["aac_improvement_halfway", "mitad_vigencia_aac", "plan_mejora_fecha"])) ??
    addMonths(aacStart, ((aacDurationYears ?? 0) * 12) / 2);

  const acreditable = toYesNo(getFirst(raw, ["acreditable", "es_acreditable"]));
  const accredited = toYesNo(getFirst(raw, ["accredited", "acreditado", "esta_acreditado"]));
  const isActiveRaw = getFirst(raw, ["is_active", "active", "activo"]);
  const isActive =
    isActiveRaw === null || isActiveRaw === undefined || String(isActiveRaw).trim() === ""
      ? true
      : toYesNo(isActiveRaw);
  const inAccreditationProcess =
    toYesNo(getFirst(raw, ["in_accreditation_process", "en_proceso_acreditacion"])) ||
    String(getFirst(raw, ["estado_aac", "estado_acreditacion"]) ?? "")
      .toLowerCase()
      .includes("proceso");

  const parsedDuration = parseDurationFromValue(getFirst(raw, ["duration", "duracion"]));
  const parsedDurationUnit = parseDurationFromValue(
    getFirst(raw, ["duration_unit", "duracion_unidad", "unidad_duracion"]),
  ).durationUnit;

  return {
    id: String(getFirst(raw, ["id", "program_id", "codigo_proceso", "snies", "codigo"]) ?? `${program}-${Date.now()}`),
    documentCount: 0,
    isActive,
    processCode: String(getFirst(raw, ["process_code", "codigo_proceso", "codigo"]) ?? ""),
    faculty,
    program,
    degree: String(getFirst(raw, ["degree", "titulo_otorgado", "titulo"]) ?? "") || null,
    snies: String(getFirst(raw, ["snies", "codigo_snies"]) ?? "") || null,
    creationAgreement: String(getFirst(raw, ["creation_agreement", "acuerdo_creacion"]) ?? "") || null,
    noRenewal: String(getFirst(raw, ["no_renewal", "no_renovacion"]) ?? "") || null,
    authorizedAdmissionsMen: toNumber(getFirst(raw, ["authorized_admissions_men", "admitidos_autorizados", "admitidos_men"])) || null,
    admissionPeriodicity: String(getFirst(raw, ["admission_periodicity", "periodicidad_admision"]) ?? "") || null,
    agreementCode: String(getFirst(raw, ["agreement_code", "codigo_convenio"]) ?? "") || null,
    agreementIes: String(getFirst(raw, ["agreement_ies", "ies_convenio"]) ?? "") || null,
    agreementAdministrator: String(getFirst(raw, ["agreement_administrator", "administrador_convenio"]) ?? "") || null,
    location: String(getFirst(raw, ["location", "lugar_desarrollo", "sede"]) ?? "") || null,
    workday: String(getFirst(raw, ["workday", "jornada"]) ?? "") || null,
    regionalized: normalizeRegionalized(getFirst(raw, ["regionalized", "regionalizado"])),
    level: String(getFirst(raw, ["level", "nivel_academico", "nivel"]) ?? "") || null,
    academicLevel: String(getFirst(raw, ["academic_level", "nivel_formacion_academico"]) ?? "") || null,
    modality: String(getFirst(raw, ["modality", "modalidad"]) ?? "") || null,
    methodology: normalizeMethodology(getFirst(raw, ["methodology", "metodologia"])),
    researchCredits: toNumber(getFirst(raw, ["research_credits", "creditos_investigacion"])) || null,
    deepeningCredits: toNumber(getFirst(raw, ["deepening_credits", "creditos_profundizacion"])) || null,
    totalAcademicCredits: toNumber(getFirst(raw, ["total_academic_credits", "total_creditos_academicos"])) || null,
    duration: parsedDuration.duration,
    durationUnit: parsedDurationUnit ?? parsedDuration.durationUnit,
    reformAcademicCouncil: String(getFirst(raw, ["reform_academic_council", "reforma_consejo_academico"]) ?? "") || null,
    reformSuperiorCouncil: String(getFirst(raw, ["reform_superior_council", "reforma_consejo_superior"]) ?? "") || null,
    reformMineducacion: String(getFirst(raw, ["reform_mineducacion", "reforma_mineducacion"]) ?? "") || null,
    ticPercentage: toNumber(getFirst(raw, ["tic_percentage", "porcentaje_tic"])) || null,
    hasCurrentRc: isFuture(rcEnd),
    rcResolution: String(getFirst(raw, ["rc_resolution", "resolucion_rc"]) ?? "") || null,
    rcStart,
    rcDurationYears,
    rcSiga,
    rcMineducacion,
    rcEnd,
    rcExtensionDecree1330: toIsoDate(getFirst(raw, ["rc_extension_decree_1330"])) || null,
    rcExtensionDecree1174: toIsoDate(getFirst(raw, ["rc_extension_decree_1174"])) || null,
    rcHistoricalResolutions: String(getFirst(raw, ["rc_historical_resolutions", "historico_resoluciones_rc"]) ?? "") || null,
    rcResolutionCount: toNumber(getFirst(raw, ["rc_resolution_count", "cantidad_res_rc"])) || null,
    rcOfficialResolution: String(getFirst(raw, ["rc_official_resolution", "resolucion_rc_oficio"]) ?? "") || null,
    rcDeniedResolution: String(getFirst(raw, ["rc_denied_resolution", "resolucion_rc_negada"]) ?? "") || null,
    numberGraduates: toNumber(getFirst(raw, ["number_graduates", "numero_egresados"])) || null,
    acreditable,
    accredited,
    inAccreditationProcess,
    aacResolution: String(getFirst(raw, ["aac_resolution", "resolucion_aac"]) ?? "") || null,
    aacStart,
    aacDurationYears,
    aacCgcaiDelivery: toIsoDate(getFirst(raw, ["aac_cgcai_delivery"])) || null,
    aacMineducacionFiling: toIsoDate(getFirst(raw, ["aac_mineducacion_filing"])) || null,
    aacEnd,
    aacImprovementHalfway,
    aacHistoricalResolutions: String(getFirst(raw, ["aac_historical_resolutions", "historico_resoluciones_aac"]) ?? "") || null,
    aacResolutionCount: toNumber(getFirst(raw, ["aac_resolution_count", "cantidad_res_aac"])) || null,
    aacDeniedResolution: String(getFirst(raw, ["aac_denied_resolution", "resolucion_aac_negada"]) ?? "") || null,
    accreditationGuideline: String(getFirst(raw, ["accreditation_guideline", "lineamiento_acreditacion"]) ?? "") || null,
    generalObservations: String(getFirst(raw, ["general_observations", "observaciones_generales"]) ?? "") || null,
    programCoordinator: String(getFirst(raw, ["program_coordinator", "coordinador_programa"]) ?? "") || null,
    programCoordinatorEmail: String(getFirst(raw, ["program_coordinator_email", "correo_coordinador", "coordinador_email"]) ?? "") || null,
    programCoordinatorTitle: String(getFirst(raw, ["program_coordinator_title", "titulo_coordinador", "coordinador_titulo"]) ?? "") || null,
    observacionesAlertaRrc: String(getFirst(raw, ["observaciones_alerta_rrc", "alerta_rrc_observaciones"]) ?? "") || null,
    observacionesAlertaAcreditados: String(getFirst(raw, ["observaciones_alerta_acreditados", "alerta_acreditados_observaciones"]) ?? "") || null,
    source: "supabase",
  };
}

async function fetchFromSupabase(): Promise<ConsolidadoProgram[] | null> {
  const client = createSupabaseClient();

  if (!client) return null;

  const candidateTables = [
    "consolidado",
    "consolidado_programas",
    "programas_consolidado",
    "programas_rc",
  ];

  for (const table of candidateTables) {
    const { data, error } = await client.from(table).select("*").limit(2000);
    if (error || !data) continue;

    const mapped = data
      .map((row) => mapSupabaseRow(row as Record<string, unknown>))
      .filter((row): row is ConsolidadoProgram => row !== null);

    if (mapped.length > 0) {
      const programIds = mapped.map((program) => program.id);
      const documentCounts = new Map<string, number>();

      const { data: documentRows, error: documentError } = await client
        .from("consolidado_documentos")
        .select("program_id")
        .in("program_id", programIds);

      if (!documentError && Array.isArray(documentRows)) {
        for (const row of documentRows as Array<{ program_id?: string | null }>) {
          const programId = row.program_id ?? "";
          if (!programId) continue;
          documentCounts.set(programId, (documentCounts.get(programId) ?? 0) + 1);
        }
      }

      return mapped.map((program) => ({
        ...program,
        documentCount: documentCounts.get(program.id) ?? 0,
      }));
    }
  }

  return null;
}

function mapExcelRow(ws: XLSX.WorkSheet, row: number): ConsolidadoProgram | null {
  const val = (col: string) => ws[`${col}${row}`]?.v;

  const processCode = String(val("B") ?? "").trim();
  const faculty = String(val("C") ?? "").trim();
  const program = String(val("D") ?? "").trim();

  if (!program || !faculty || !processCode) return null;

  // R.C. calculations
  const rcStart = toIsoDate(val("AF"));
  const rcDurationYears = toNumber(val("AG"));
  const rcEnd = toIsoDate(val("AJ")) ?? addMonths(rcStart, (rcDurationYears ?? 0) * 12);
  const rcSiga = toIsoDate(val("AH")) ?? addMonths(rcStart, (rcDurationYears ?? 0) * 12 - 14);
  const rcMineducacion = toIsoDate(val("AI")) ?? addMonths(rcStart, (rcDurationYears ?? 0) * 12 - 12);

  // A.A.C. calculations
  const aacStart = toIsoDate(val("AV"));
  const aacDurationYears = toNumber(val("AW"));
  const aacEnd = toIsoDate(val("AZ")) ?? addMonths(aacStart, (aacDurationYears ?? 0) * 12);
  const aacImprovementHalfway = toIsoDate(val("BA")) ?? addMonths(aacStart, ((aacDurationYears ?? 0) * 12) / 2);
  const parsedDuration = parseDurationFromValue(val("X"));

  return {
    id: `${processCode}-${String(val("G") ?? "")}`,
    documentCount: 0,
    isActive: true,
    // Basic Program Information
    processCode,
    faculty,
    program,
    degree: String(val("E") ?? "").trim() || null,
    snies: String(val("G") ?? "").trim() || null,

    // Administrative Details
    creationAgreement: String(val("F") ?? "").trim() || null,
    noRenewal: String(val("H") ?? "").trim() || null,
    authorizedAdmissionsMen: toNumber(val("I")) || null,
    admissionPeriodicity: String(val("J") ?? "").trim() || null,
    agreementCode: String(val("K") ?? "").trim() || null,
    agreementIes: String(val("L") ?? "").trim() || null,
    agreementAdministrator: String(val("M") ?? "").trim() || null,

    // Location and Format
    location: String(val("N") ?? "").trim() || null,
    workday: String(val("O") ?? "").trim() || null,
    regionalized: normalizeRegionalized(val("P")),
    level: String(val("Q") ?? "").trim() || null,
    academicLevel: String(val("R") ?? "").trim() || null,
    modality: String(val("S") ?? "").trim() || null,
    methodology: normalizeMethodology(val("T")),

    // Academic Credits
    researchCredits: toNumber(val("U")) || null,
    deepeningCredits: toNumber(val("V")) || null,
    totalAcademicCredits: toNumber(val("W")) || null,
    duration: parsedDuration.duration,
    durationUnit: parsedDuration.durationUnit,

    // Reforms
    reformAcademicCouncil: String(val("Y") ?? "").trim() || null,
    reformSuperiorCouncil: String(val("Z") ?? "").trim() || null,
    reformMineducacion: String(val("AA") ?? "").trim() || null,
    ticPercentage: toNumber(val("AB")) || null,

    // Current R.C. (Registro de Calificación)
    hasCurrentRc: isFuture(rcEnd),
    rcResolution: String(val("AC") ?? "").trim() || null,
    rcStart,
    rcDurationYears,
    rcSiga,
    rcMineducacion,
    rcEnd,
    rcExtensionDecree1330: toIsoDate(val("AK")) || null,
    rcExtensionDecree1174: toIsoDate(val("AL")) || null,
    rcHistoricalResolutions: String(val("AM") ?? "").trim() || null,
    rcResolutionCount: toNumber(val("AN")) || null,
    rcOfficialResolution: String(val("AO") ?? "").trim() || null,
    rcDeniedResolution: String(val("AP") ?? "").trim() || null,

    // Graduates
    numberGraduates: toNumber(val("AQ")) || null,

    // Accreditation (A.A.C.)
    acreditable: toYesNo(val("AR")),
    accredited: toYesNo(val("AS")),
    inAccreditationProcess: toYesNo(val("AT")) || String(val("AT") ?? "").trim().length > 0,
    aacResolution: String(val("AU") ?? "").trim() || null,
    aacStart,
    aacDurationYears,
    aacCgcaiDelivery: toIsoDate(val("AX")) || null,
    aacMineducacionFiling: toIsoDate(val("AY")) || null,
    aacEnd,
    aacImprovementHalfway,
    aacHistoricalResolutions: String(val("BB") ?? "").trim() || null,
    aacResolutionCount: toNumber(val("BC")) || null,
    aacDeniedResolution: String(val("BD") ?? "").trim() || null,

    // Notes and Metadata
    accreditationGuideline: String(val("BE") ?? "").trim() || null,
    generalObservations: String(val("BF") ?? "").trim() || null,
    programCoordinator: String(val("BG") ?? "").trim() || null,
    programCoordinatorEmail: String(val("BH") ?? "").trim() || null,
    programCoordinatorTitle: null,
    observacionesAlertaRrc: null,
    observacionesAlertaAcreditados: null,
    source: "excel",
  };
}

async function fetchFromExcel(): Promise<ConsolidadoProgram[]> {
  const workbookPath = path.join(process.cwd(), "Consolidado-RC AAC  GENERAL (3).xlsx");
  const buffer = await fs.readFile(workbookPath);
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = wb.Sheets.Consolidado;

  if (!ws || !ws["!ref"]) {
    return [];
  }

  const range = XLSX.utils.decode_range(ws["!ref"]);
  const programs: ConsolidadoProgram[] = [];

  for (let row = 7; row <= range.e.r + 1; row++) {
    const mapped = mapExcelRow(ws, row);
    if (mapped) programs.push(mapped);
  }

  return programs;
}

function buildDashboard(programs: ConsolidadoProgram[]): ConsolidadoDashboard {
  const totalPrograms = programs.length;
  const faculties = new Set(programs.map((p) => p.faculty)).size;
  const activeRc = programs.filter((p) => p.hasCurrentRc === true).length;
  const expiredRc = programs.filter((p) => p.hasCurrentRc === false).length;
  const accredited = programs.filter((p) => p.accredited).length;
  const inAacProcess = programs.filter((p) => p.inAccreditationProcess).length;
  const upcomingRrcIn120Days = programs.filter((p) => {
    const days = daysUntil(p.rcMineducacion);
    return days !== null && days >= 0 && days <= 120;
  }).length;

  const facultyMap = new Map<string, { programs: number; activeRc: number; accredited: number }>();
  for (const program of programs) {
    const current = facultyMap.get(program.faculty) ?? { programs: 0, activeRc: 0, accredited: 0 };
    current.programs += 1;
    if (program.hasCurrentRc) current.activeRc += 1;
    if (program.accredited) current.accredited += 1;
    facultyMap.set(program.faculty, current);
  }

  const byFaculty = [...facultyMap.entries()]
    .map(([faculty, values]) => ({ faculty, ...values }))
    .sort((a, b) => b.programs - a.programs);

  return {
    source: programs[0]?.source ?? "excel",
    generatedAt: new Date().toISOString(),
    summary: {
      totalPrograms,
      faculties,
      activeRc,
      expiredRc,
      accredited,
      inAacProcess,
      upcomingRrcIn120Days,
    },
    byFaculty,
    programs: programs.sort((a, b) =>
      a.faculty === b.faculty ? a.program.localeCompare(b.program, "es") : a.faculty.localeCompare(b.faculty, "es"),
    ),
  };
}

export async function getConsolidadoDashboard(): Promise<ConsolidadoDashboard> {
  const supabasePrograms = await fetchFromSupabase();
  if (supabasePrograms && supabasePrograms.length > 0) {
    return buildDashboard(supabasePrograms);
  }

  const excelPrograms = await fetchFromExcel();
  return buildDashboard(excelPrograms);
}
