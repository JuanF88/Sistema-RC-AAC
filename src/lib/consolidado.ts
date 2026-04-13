import fs from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

export type ConsolidadoProgram = {
  id: string;
  processCode: string;
  snies: string;
  faculty: string;
  program: string;
  degree: string;
  location: string;
  level: string;
  modality: string;
  rcStart: string | null;
  rcDurationYears: number | null;
  rcEnd: string | null;
  rrcSiga: string | null;
  rrcMineducacion: string | null;
  hasCurrentRc: boolean | null;
  acreditable: boolean;
  accredited: boolean;
  inAccreditationProcess: boolean;
  aacStart: string | null;
  aacDurationYears: number | null;
  aacEnd: string | null;
  improvementHalfway: string | null;
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

function toIsoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y && parsed?.m && parsed?.d) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
        .toISOString()
        .slice(0, 10);
    }
  }

  if (typeof value === "string") {
    const clean = value.trim();
    if (!clean) return null;

    const direct = new Date(clean);
    if (!Number.isNaN(direct.getTime())) {
      return direct.toISOString().slice(0, 10);
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

  const rrcSiga =
    toIsoDate(getFirst(raw, ["rrc_siga", "siga_rrc", "fecha_siga_rrc"])) ??
    addMonths(rcStart, (rcDurationYears ?? 0) * 12 - 14);

  const rrcMineducacion =
    toIsoDate(getFirst(raw, ["rrc_mineducacion", "plazo_radicacion_rrc", "rrc_min"])) ??
    addMonths(rcStart, (rcDurationYears ?? 0) * 12 - 12);

  const aacStart = toIsoDate(getFirst(raw, ["aac_start", "inicio_aac", "inicio_acreditacion"]));
  const aacDurationYears = toNumber(getFirst(raw, ["aac_duration_years", "duracion_aac", "duracion_aac_anios"]));
  const aacEnd =
    toIsoDate(getFirst(raw, ["aac_end", "vencimiento_aac", "fin_aac"])) ??
    addMonths(aacStart, (aacDurationYears ?? 0) * 12);

  const improvementHalfway =
    toIsoDate(getFirst(raw, ["improvement_halfway", "mitad_vigencia_aac", "plan_mejora_fecha"])) ??
    addMonths(aacStart, ((aacDurationYears ?? 0) * 12) / 2);

  const acreditable = toYesNo(getFirst(raw, ["acreditable", "es_acreditable"]));
  const accredited = toYesNo(getFirst(raw, ["accredited", "acreditado", "esta_acreditado"]));
  const inAccreditationProcess =
    toYesNo(getFirst(raw, ["in_accreditation_process", "en_proceso_acreditacion"])) ||
    String(getFirst(raw, ["estado_aac", "estado_acreditacion"]) ?? "")
      .toLowerCase()
      .includes("proceso");

  return {
    id: String(getFirst(raw, ["id", "program_id", "codigo_proceso", "snies", "codigo"]) ?? program),
    processCode: String(getFirst(raw, ["process_code", "codigo_proceso", "codigo"]) ?? ""),
    snies: String(getFirst(raw, ["snies", "codigo_snies"]) ?? ""),
    faculty,
    program,
    degree: String(getFirst(raw, ["degree", "titulo_otorgado", "titulo"]) ?? ""),
    location: String(getFirst(raw, ["location", "lugar_desarrollo", "sede"]) ?? ""),
    level: String(getFirst(raw, ["level", "nivel_academico", "nivel"]) ?? ""),
    modality: String(getFirst(raw, ["modality", "modalidad"]) ?? ""),
    rcStart,
    rcDurationYears,
    rcEnd,
    rrcSiga,
    rrcMineducacion,
    hasCurrentRc: isFuture(rcEnd),
    acreditable,
    accredited,
    inAccreditationProcess,
    aacStart,
    aacDurationYears,
    aacEnd,
    improvementHalfway,
    source: "supabase",
  };
}

async function fetchFromSupabase(): Promise<ConsolidadoProgram[] | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

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
      return mapped;
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

  const rcStart = toIsoDate(val("AF"));
  const rcDurationYears = toNumber(val("AG"));
  const rcEnd = toIsoDate(val("AJ")) ?? addMonths(rcStart, (rcDurationYears ?? 0) * 12);
  const rrcSiga = toIsoDate(val("AH")) ?? addMonths(rcStart, (rcDurationYears ?? 0) * 12 - 14);
  const rrcMineducacion =
    toIsoDate(val("AI")) ?? addMonths(rcStart, (rcDurationYears ?? 0) * 12 - 12);

  const aacStart = toIsoDate(val("AV"));
  const aacDurationYears = toNumber(val("AW"));
  const aacEnd = toIsoDate(val("AZ")) ?? addMonths(aacStart, (aacDurationYears ?? 0) * 12);
  const improvementHalfway =
    toIsoDate(val("BA")) ?? addMonths(aacStart, ((aacDurationYears ?? 0) * 12) / 2);

  return {
    id: `${processCode}-${String(val("G") ?? "")}`,
    processCode,
    snies: String(val("G") ?? "").trim(),
    faculty,
    program,
    degree: String(val("E") ?? "").trim(),
    location: String(val("N") ?? "").trim(),
    level: String(val("R") ?? "").trim(),
    modality: String(val("S") ?? "").trim(),
    rcStart,
    rcDurationYears,
    rcEnd,
    rrcSiga,
    rrcMineducacion,
    hasCurrentRc: isFuture(rcEnd),
    acreditable: toYesNo(val("AR")),
    accredited: toYesNo(val("AS")),
    inAccreditationProcess: toYesNo(val("AT")) || String(val("AT") ?? "").trim().length > 0,
    aacStart,
    aacDurationYears,
    aacEnd,
    improvementHalfway,
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
    const days = daysUntil(p.rrcMineducacion);
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
