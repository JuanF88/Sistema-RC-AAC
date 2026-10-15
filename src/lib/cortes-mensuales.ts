/**
 * Cortes mensuales del consolidado de programas.
 *
 * Cada mes queda guardado un archivo con los programas que existían al cierre
 * de ese mes, de modo que se pueda responder "cuántos programas había en
 * agosto" sin tener que reconstruir nada a mano.
 *
 * La base de datos guarda la fecha en que cada programa quedó registrado
 * (created_at), así que el corte de un mes incluye los programas registrados
 * hasta el último instante de ese mes en hora de Bogotá. Los valores de cada
 * campo son los vigentes al momento de generar el corte: la tabla no conserva
 * versiones anteriores. Eso queda explicado dentro de cada archivo, en la hoja
 * "Nota metodológica".
 *
 * Los archivos viven en la carpeta "cortes" del bucket historicos-database, al
 * lado de las instantáneas, y se consultan desde la pestaña "Cortes mensuales"
 * del historial.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ExcelJS, { type Row, type Worksheet } from "exceljs";

import { formatDurationLabel } from "@/lib/duration";

/** Carpeta del bucket donde se guardan los cortes. */
const CORTES_FOLDER = "cortes";

const BUCKET = "historicos-database";

/** Bogotá no tiene horario de verano: siempre UTC-5. */
const BOGOTA_OFFSET_HOURS = 5;

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Fila cruda de consolidado_programas, tal como la devuelve Supabase. */
type ProgramRow = Record<string, string | number | boolean | null>;

export type CorteRecord = {
  /** Mes del corte en formato "2026-08". */
  month: string;
  /** "Agosto de 2026". */
  label: string;
  /** Último día del mes: "31 de agosto de 2026". */
  cutoffLabel: string;
  filename: string;
  url: string;
  /** Programas registrados hasta el cierre del mes. */
  programs: number;
  /** Momento en que se generó el archivo. */
  generatedAt: string;
};

export type CorteGenerationResult = {
  generated: CorteRecord[];
  skipped: string[];
  failed: { month: string; error: string }[];
};

function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Faltan las variables de entorno de Supabase para generar los cortes mensuales.");
  }

  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

// ---------------------------------------------------------------------------
// Meses
// ---------------------------------------------------------------------------

/** Instante en que termina un mes, sin incluirlo: el inicio del mes siguiente. */
function monthEndExclusive(month: string): Date {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 1, BOGOTA_OFFSET_HOURS, 0, 0, 0));
}

/** Mes al que pertenece un instante, en hora de Bogotá. */
function monthOf(date: Date): string {
  const bogota = new Date(date.getTime() - BOGOTA_OFFSET_HOURS * 60 * 60 * 1000);
  const year = bogota.getUTCFullYear();
  const month = String(bogota.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function previousMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Lista de meses entre dos extremos, ambos incluidos. */
function monthsBetween(first: string, last: string): string[] {
  const months: string[] = [];
  let current = first;

  while (current <= last) {
    months.push(current);
    current = nextMonth(current);
  }

  return months;
}

/** "Agosto de 2026". */
export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const formatted = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 15)));

  return formatted.charAt(0).toLocaleUpperCase("es") + formatted.slice(1);
}

/** "31 de agosto de 2026". */
function cutoffLabel(month: string): string {
  const end = monthEndExclusive(month);
  const lastDay = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(lastDay);
}

// ---------------------------------------------------------------------------
// Archivos
// ---------------------------------------------------------------------------

/**
 * El nombre lleva el mes y la cantidad de programas, para que el listado pueda
 * mostrar la cifra sin volver a calcularla y sin guardar nada aparte.
 */
function buildFilename(month: string, programs: number): string {
  return `corte-${month}_${programs}-programas.xlsx`;
}

const FILENAME_PATTERN = /^corte-(\d{4}-\d{2})_(\d+)-programas\.xlsx$/;

function parseFilename(name: string): { month: string; programs: number } | null {
  const match = FILENAME_PATTERN.exec(name);
  if (!match) return null;

  return { month: match[1], programs: Number(match[2]) };
}

// ---------------------------------------------------------------------------
// Formato de celdas, igual al de las demás exportaciones del sistema
// ---------------------------------------------------------------------------

const BORDER = {
  top: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
  left: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
  bottom: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
  right: { style: "thin" as const, color: { argb: "FFE2E8F0" } },
};

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function numberOrEmpty(value: unknown): number | string {
  if (value === null || value === undefined || value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : text(value);
}

function formatDate(value: unknown): string {
  if (!value) return "";
  try {
    return new Date(String(value)).toLocaleDateString("es-CO");
  } catch {
    return text(value);
  }
}

function formatRegionalized(value: unknown): string {
  if (typeof value === "boolean") return value ? "SI" : "NO";

  const normalized = text(value).trim().toLowerCase();
  if (!normalized) return "NO";
  if (normalized === "true" || normalized === "si" || normalized === "sí") return "SI";
  if (normalized === "false" || normalized === "no") return "NO";
  if (normalized.includes("ampliacion") || normalized.includes("ampliación")) {
    return "Ampliación de lugar de desarrollo";
  }

  return text(value);
}

function siNo(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  return value ? "Sí" : "No";
}

type CorteColumn = [header: string, read: (row: ProgramRow) => string | number];

const COLUMNS: CorteColumn[] = [
  ["Código Proceso", (row) => text(row.process_code)],
  ["Facultad", (row) => text(row.faculty)],
  ["Programa", (row) => text(row.program)],
  ["Estado", (row) => (row.is_active === false ? "Inactivo" : "Activo")],
  ["Título Otorgado", (row) => text(row.degree)],
  ["Acuerdo Creación", (row) => text(row.creation_agreement)],
  ["SNIES", (row) => text(row.snies)],
  ["No Renovación", (row) => text(row.no_renewal)],
  ["Admitidos MEN", (row) => numberOrEmpty(row.authorized_admissions_men)],
  ["Periodicidad Admisión", (row) => text(row.admission_periodicity)],
  ["Código Convenio", (row) => text(row.agreement_code)],
  ["IES Convenio", (row) => text(row.agreement_ies)],
  ["Administrador Convenio", (row) => text(row.agreement_administrator)],
  ["Lugar Desarrollo", (row) => text(row.location) || "-"],
  ["Jornada", (row) => text(row.workday)],
  ["Regionalizado", (row) => formatRegionalized(row.regionalized)],
  ["Nivel Académico", (row) => text(row.academic_level)],
  ["Nivel", (row) => text(row.level)],
  ["Modalidad", (row) => text(row.modality)],
  ["Metodología", (row) => text(row.methodology)],
  ["Créditos Investigación", (row) => numberOrEmpty(row.research_credits)],
  ["Créditos Profundización", (row) => numberOrEmpty(row.deepening_credits)],
  ["Total Créditos", (row) => numberOrEmpty(row.total_academic_credits)],
  [
    "Duración",
    (row) =>
      formatDurationLabel(
        row.duration === null || row.duration === undefined ? null : Number(row.duration),
        row.duration_unit,
      ),
  ],
  ["Reforma Consejo Académico", (row) => text(row.reform_academic_council)],
  ["Reforma Consejo Superior", (row) => text(row.reform_superior_council)],
  ["Reforma MinEducación", (row) => text(row.reform_mineducacion)],
  ["% TIC", (row) => numberOrEmpty(row.tic_percentage)],
  ["Con RC", (row) => siNo(row.has_current_rc)],
  ["Resolución RC", (row) => text(row.rc_resolution)],
  ["Inicio RC", (row) => formatDate(row.rc_start)],
  ["Duración RC (años)", (row) => numberOrEmpty(row.rc_duration_years)],
  ["SiGA RRC", (row) => formatDate(row.rc_siga)],
  ["Plazo Radicación RRC", (row) => formatDate(row.rc_mineducacion)],
  ["Vencimiento RC", (row) => formatDate(row.rc_end)],
  ["Extensión Decreto 1330", (row) => formatDate(row.rc_extension_decree_1330)],
  ["Extensión Decreto 1174", (row) => formatDate(row.rc_extension_decree_1174)],
  ["Histórico Resoluciones RC", (row) => text(row.rc_historical_resolutions)],
  ["Cantidad Resoluciones RC", (row) => numberOrEmpty(row.rc_resolution_count)],
  ["Resolución RC Oficio", (row) => text(row.rc_official_resolution)],
  ["Resolución RC Negada", (row) => text(row.rc_denied_resolution)],
  ["Fecha concepto de ejecutoria RC", (row) => formatDate(row.rc_executoria_concept_date)],
  ["Acreditable", (row) => siNo(row.acreditable)],
  ["Acreditado", (row) => siNo(row.accredited)],
  ["Resolución AAC", (row) => text(row.aac_resolution)],
  ["Inicio AAC", (row) => formatDate(row.aac_start)],
  ["Duración AAC (años)", (row) => numberOrEmpty(row.aac_duration_years)],
  ["Entrega CGCAI", (row) => formatDate(row.aac_cgcai_delivery)],
  ["Plazo Radicación AAC", (row) => formatDate(row.aac_mineducacion_filing)],
  ["Vencimiento AAC", (row) => formatDate(row.aac_end)],
  ["Mitad Vigencia AAC", (row) => formatDate(row.aac_improvement_halfway)],
  ["Histórico Resoluciones AAC", (row) => text(row.aac_historical_resolutions)],
  ["Cantidad Resoluciones AAC", (row) => numberOrEmpty(row.aac_resolution_count)],
  ["Resolución AAC Negada", (row) => text(row.aac_denied_resolution)],
  ["Fecha concepto de ejecutoria AAC", (row) => formatDate(row.aac_executoria_concept_date)],
  ["Lineamiento Acreditación", (row) => text(row.accreditation_guideline)],
  ["Observaciones", (row) => text(row.general_observations)],
  ["Coordinador Programa", (row) => text(row.program_coordinator) || "-"],
  ["Email Coordinador", (row) => text(row.program_coordinator_email) || "-"],
  ["Título Coordinador", (row) => text(row.program_coordinator_title) || "-"],
  ["Registrado en el sistema", (row) => formatDate(row.created_at)],
];

function styleHeaderRow(sheet: Worksheet): void {
  const header = sheet.getRow(1);
  header.height = 30;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFA21F" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = BORDER;
  });
}

function styleBodyRow(row: Row, index: number): void {
  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: index % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC" },
    };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = BORDER;
  });
}

function countBy(rows: ProgramRow[], read: (row: ProgramRow) => unknown): [string, number][] {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const key = text(read(row)).trim() || "Sin definir";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
}

// ---------------------------------------------------------------------------
// Construcción del archivo
// ---------------------------------------------------------------------------

async function buildCorteWorkbook(
  month: string,
  programs: ProgramRow[],
  generatedAt: Date,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema RC-AAC";
  workbook.created = generatedAt;

  const cutoff = cutoffLabel(month);
  const activos = programs.filter((row) => row.is_active !== false).length;
  // Un corte generado durante el mes siguiente al cierre refleja el estado real
  // de ese momento; uno generado más tarde es una reconstrucción.
  const generadoAlCierre = monthOf(generatedAt) <= nextMonth(month);

  // --- Hoja 1: Resumen ---
  const resumen = workbook.addWorksheet("Resumen");
  resumen.columns = [
    { header: "Concepto", key: "concepto", width: 48 },
    { header: "Valor", key: "valor", width: 18 },
  ];
  styleHeaderRow(resumen);

  const bloques: [string, string | number][] = [
    [`PROGRAMAS AL CORTE DEL ${cutoff.toLocaleUpperCase("es")}`, programs.length],
    ["Activos al momento de generar el corte", activos],
    ["", ""],
    ["POR FACULTAD", ""],
    ...countBy(programs, (row) => row.faculty),
    ["", ""],
    ["POR NIVEL ACADÉMICO", ""],
    ...countBy(programs, (row) => row.academic_level),
    ["", ""],
    ["POR NIVEL", ""],
    ...countBy(programs, (row) => row.level),
    ["", ""],
    ["POR MODALIDAD", ""],
    ...countBy(programs, (row) => row.modality),
    ["", ""],
    ["ACREDITACIÓN", ""],
    ["Acreditables", programs.filter((row) => row.acreditable).length],
    ["Acreditados", programs.filter((row) => row.accredited).length],
    ["Con registro calificado vigente", programs.filter((row) => row.has_current_rc).length],
  ];

  bloques.forEach(([concepto, valor], index) => {
    const row = resumen.addRow({ concepto, valor });
    row.eachCell((cell) => {
      cell.border = BORDER;
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });

    const esTitulo = concepto !== "" && valor === "";
    if (esTitulo || index === 0) {
      row.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      });
    }

    row.getCell("valor").alignment = { vertical: "middle", horizontal: "center" };
  });

  // --- Hoja 2: listado de programas ---
  const listado = workbook.addWorksheet(`Programas al ${month}`, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  listado.columns = COLUMNS.map(([header]) => ({ header, width: 18 }));
  styleHeaderRow(listado);
  programs.forEach((program, index) => {
    styleBodyRow(
      listado.addRow(COLUMNS.map(([, read]) => read(program))),
      index,
    );
  });

  // --- Hoja 3: nota metodológica ---
  const nota = workbook.addWorksheet("Nota metodológica");
  nota.columns = [{ header: "Cómo se construyó este corte", key: "texto", width: 120 }];
  styleHeaderRow(nota);

  const parrafos = [
    `Corte: ${cutoff} (hora de Bogotá), correspondiente a ${monthLabel(month)}.`,
    `Archivo generado el ${generatedAt.toLocaleDateString("es-CO")}${generadoAlCierre ? " (al cierre del mes)." : " (reconstruido después del cierre)."}`,
    "",
    `Programas registrados hasta el cierre del mes: ${programs.length}.`,
    `De ellos, activos al momento de generar este archivo: ${activos}.`,
    "",
    "Criterio: la base de datos guarda la fecha en que cada programa quedó registrado en el sistema, así que el listado incluye únicamente los programas que ya estaban registrados al cerrar el mes. La columna \"Registrado en el sistema\" muestra esa fecha para cada programa.",
    "",
    "Alcance de la información: la base de datos no conserva versiones anteriores de cada campo, solo el valor vigente. El listado corresponde a los programas que existían al corte, con los datos como estaban al generar este archivo. Si un dato se corrigió después del cierre del mes, aquí aparece ya corregido.",
    "",
    "Estado de los programas: la columna \"Estado\" indica si el programa estaba activo o inactivo al generar este archivo. El sistema no registra la fecha en que un programa se marca como inactivo, así que en un corte reconstruido un programa puede aparecer como inactivo aunque estuviera activo durante el mes del corte.",
    "",
    "Limitación: si un programa se eliminó por completo del sistema, no queda rastro de él y no puede incluirse en los cortes.",
  ];

  parrafos.forEach((texto) => {
    const row = nota.addRow({ texto });
    row.getCell("texto").alignment = { vertical: "top", horizontal: "left", wrapText: true };
    if (texto) {
      row.height = Math.max(18, Math.ceil(texto.length / 110) * 16);
    }
  });

  const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
  return Buffer.from(buffer);
}

// ---------------------------------------------------------------------------
// Lectura y generación
// ---------------------------------------------------------------------------

async function loadProgramRows(client: SupabaseClient): Promise<ProgramRow[]> {
  const { data, error } = await client
    .from("consolidado_programas")
    .select("*")
    .order("faculty", { ascending: true })
    .order("program", { ascending: true })
    .limit(5000);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ProgramRow[];
}

function programsAtCutoff(rows: ProgramRow[], month: string): ProgramRow[] {
  const cutoff = monthEndExclusive(month).getTime();

  return rows.filter((row) => {
    const createdAt = text(row.created_at);
    if (!createdAt) return false;

    const time = new Date(createdAt).getTime();
    return Number.isFinite(time) && time < cutoff;
  });
}

/** Mes más antiguo con información cargada. */
function firstMonthWithData(rows: ProgramRow[]): string | null {
  let earliest: number | null = null;

  for (const row of rows) {
    const createdAt = text(row.created_at);
    if (!createdAt) continue;

    const time = new Date(createdAt).getTime();
    if (!Number.isFinite(time)) continue;
    if (earliest === null || time < earliest) earliest = time;
  }

  return earliest === null ? null : monthOf(new Date(earliest));
}

async function listStoredCortes(client: SupabaseClient): Promise<CorteRecord[]> {
  const { data, error } = await client.storage.from(BUCKET).list(CORTES_FOLDER, {
    limit: 500,
    sortBy: { column: "name", order: "desc" },
  });

  if (error) {
    throw new Error(error.message);
  }

  const records: CorteRecord[] = [];

  for (const file of data ?? []) {
    const parsed = parseFilename(file.name);
    if (!parsed) continue;

    const path = `${CORTES_FOLDER}/${file.name}`;
    const { data: publicData } = client.storage.from(BUCKET).getPublicUrl(path);

    records.push({
      month: parsed.month,
      label: monthLabel(parsed.month),
      cutoffLabel: cutoffLabel(parsed.month),
      filename: file.name,
      url: publicData.publicUrl,
      programs: parsed.programs,
      generatedAt: file.created_at ?? file.updated_at ?? new Date().toISOString(),
    });
  }

  return records.sort((a, b) => b.month.localeCompare(a.month));
}

/**
 * Meses que ya se pueden cortar: desde el primer mes con información hasta el
 * último mes cerrado. El mes en curso se corta cuando termine.
 */
function expectedMonths(rows: ProgramRow[], now: Date): string[] {
  const first = firstMonthWithData(rows);
  if (!first) return [];

  const last = previousMonth(monthOf(now));
  if (last < first) return [];

  return monthsBetween(first, last);
}

export type CorteListing = {
  cortes: CorteRecord[];
  /** Meses cerrados que todavía no tienen corte guardado. */
  missing: string[];
};

export async function listCortes(): Promise<CorteListing> {
  const client = getAdminClient();
  const [cortes, rows] = await Promise.all([listStoredCortes(client), loadProgramRows(client)]);
  const stored = new Set(cortes.map((corte) => corte.month));

  return {
    cortes,
    missing: expectedMonths(rows, new Date()).filter((month) => !stored.has(month)),
  };
}

export type GenerateCortesOptions = {
  /** Meses concretos a generar; si no se indican, se generan los que falten. */
  months?: string[];
};

/**
 * Genera y guarda los cortes que falten. Un mes que ya tiene corte guardado no
 * se vuelve a generar: el archivo guardado es el registro histórico.
 */
export async function generateCortes(options?: GenerateCortesOptions): Promise<CorteGenerationResult> {
  const client = getAdminClient();
  const now = new Date();

  const [stored, rows] = await Promise.all([listStoredCortes(client), loadProgramRows(client)]);
  const storedMonths = new Set(stored.map((corte) => corte.month));

  const requested = options?.months?.length
    ? options.months.filter((month) => /^\d{4}-\d{2}$/.test(month))
    : expectedMonths(rows, now);

  const result: CorteGenerationResult = { generated: [], skipped: [], failed: [] };

  for (const month of requested) {
    if (storedMonths.has(month)) {
      result.skipped.push(month);
      continue;
    }

    try {
      const programs = programsAtCutoff(rows, month);
      if (programs.length === 0) {
        result.skipped.push(month);
        continue;
      }

      const buffer = await buildCorteWorkbook(month, programs, now);
      const filename = buildFilename(month, programs.length);
      const path = `${CORTES_FOLDER}/${filename}`;

      const { error: uploadError } = await client.storage.from(BUCKET).upload(path, buffer, {
        contentType: XLSX_CONTENT_TYPE,
        cacheControl: "3600",
        upsert: false,
      });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: publicData } = client.storage.from(BUCKET).getPublicUrl(path);

      result.generated.push({
        month,
        label: monthLabel(month),
        cutoffLabel: cutoffLabel(month),
        filename,
        url: publicData.publicUrl,
        programs: programs.length,
        generatedAt: now.toISOString(),
      });
      storedMonths.add(month);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido al generar el corte.";
      console.error(`Error generando el corte de ${month}:`, message);
      result.failed.push({ month, error: message });
    }
  }

  return result;
}

/**
 * Pensado para el programador automático: genera los cortes pendientes y nunca
 * lanza, para que un problema aquí no tumbe el resto de la tarea programada.
 */
export async function ensureMonthlyCortes(): Promise<CorteGenerationResult | { error: string }> {
  try {
    return await generateCortes();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al generar los cortes mensuales.";
    console.error("Error en los cortes mensuales automáticos:", message);
    return { error: message };
  }
}
