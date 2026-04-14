import fs from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const workbookArg = process.argv[2]?.trim();
const workbookPath = workbookArg
  ? path.resolve(process.cwd(), workbookArg)
  : path.join(process.cwd(), "Consolidado-RC AAC  GENERAL (4).xlsx");
const tableName = "consolidado_programas";

function toIsoFromParts(year, month, day) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toIsoDate(value) {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Preserve calendar date as shown in Excel (avoid timezone shifts)
    return toIsoFromParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === "number") {
    // Excel date serial (1900 system) -> JS date
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

    const latinDate = clean.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
    if (latinDate) {
      const day = Number(latinDate[1]);
      const month = Number(latinDate[2]);
      const year = Number(latinDate[3].length === 2 ? `20${latinDate[3]}` : latinDate[3]);
      return toIsoFromParts(year, month, day);
    }
  }

  const direct = new Date(String(value));
  if (!Number.isNaN(direct.getTime())) {
    return toIsoFromParts(direct.getFullYear(), direct.getMonth() + 1, direct.getDate());
  }

  return null;
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const m = value.replace(/,/g, ".").match(/-?\d+(\.\d+)?/);
    if (m) {
      const n = Number(m[0]);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

function toYesNo(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "si" || normalized === "sí" || normalized === "yes" || normalized === "true";
}

function addMonths(isoDate, months) {
  if (!isoDate || !Number.isFinite(months)) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function mapExcelRow(ws, row) {
  const val = (col) => ws[`${col}${row}`]?.v;

  // Required fields
  const processCode = String(val("B") ?? "").trim();
  const faculty = String(val("C") ?? "").trim();
  const program = String(val("D") ?? "").trim();

  if (!processCode || !faculty || !program) return null;

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

  return {
    // Basic Program Information
    process_code: processCode,
    faculty,
    program,
    degree: String(val("E") ?? "").trim() || null,
    snies: String(val("G") ?? "").trim() || null,

    // Administrative Details
    creation_agreement: String(val("F") ?? "").trim() || null,
    no_renewal: String(val("H") ?? "").trim() || null,
    authorized_admissions_men: toNumber(val("I")) || null,
    admission_periodicity: String(val("J") ?? "").trim() || null,
    agreement_code: String(val("K") ?? "").trim() || null,
    agreement_ies: String(val("L") ?? "").trim() || null,
    agreement_administrator: String(val("M") ?? "").trim() || null,

    // Location and Format
    location: String(val("N") ?? "").trim() || null,
    workday: String(val("O") ?? "").trim() || null,
    regionalized: toYesNo(val("P")),
    level: String(val("Q") ?? "").trim() || null,
    academic_level: String(val("R") ?? "").trim() || null,
    modality: String(val("S") ?? "").trim() || null,
    methodology: String(val("T") ?? "").trim() || null,

    // Academic Credits
    research_credits: toNumber(val("U")) || null,
    deepening_credits: toNumber(val("V")) || null,
    total_academic_credits: toNumber(val("W")) || null,
    duration: toNumber(val("X")) || null,

    // Reforms
    reform_academic_council: String(val("Y") ?? "").trim() || null,
    reform_superior_council: String(val("Z") ?? "").trim() || null,
    reform_mineducacion: String(val("AA") ?? "").trim() || null,
    tic_percentage: toNumber(val("AB")) || null,

    // Current R.C. (Registro de Calificación)
    has_current_rc: rcEnd ? new Date(rcEnd).getTime() > Date.now() : null,
    rc_resolution: String(val("AC") ?? "").trim() || null,
    rc_start: rcStart,
    rc_duration_years: rcDurationYears,
    rc_siga: rcSiga,
    rc_mineducacion: rcMineducacion,
    rc_end: rcEnd,
    rc_extension_decree_1330: toIsoDate(val("AK")) || null,
    rc_extension_decree_1174: toIsoDate(val("AL")) || null,
    rc_historical_resolutions: String(val("AM") ?? "").trim() || null,
    rc_resolution_count: toNumber(val("AN")) || null,
    rc_official_resolution: String(val("AO") ?? "").trim() || null,
    rc_denied_resolution: String(val("AP") ?? "").trim() || null,

    // Graduates
    number_graduates: toNumber(val("AQ")) || null,

    // Accreditation (A.A.C.)
    acreditable: toYesNo(val("AR")),
    accredited: toYesNo(val("AS")),
    in_accreditation_process: toYesNo(val("AT")) || String(val("AT") ?? "").trim().length > 0,
    aac_resolution: String(val("AU") ?? "").trim() || null,
    aac_start: aacStart,
    aac_duration_years: aacDurationYears,
    aac_cgcai_delivery: toIsoDate(val("AX")) || null,
    aac_mineducacion_filing: toIsoDate(val("AY")) || null,
    aac_end: aacEnd,
    aac_improvement_halfway: aacImprovementHalfway,
    aac_historical_resolutions: String(val("BB") ?? "").trim() || null,
    aac_resolution_count: toNumber(val("BC")) || null,
    aac_denied_resolution: String(val("BD") ?? "").trim() || null,

    // Notes and Metadata
    accreditation_guideline: String(val("BE") ?? "").trim() || null,
    general_observations: String(val("BF") ?? "").trim() || null,
    program_coordinator: String(val("BG") ?? "").trim() || null,
    source: "excel",
  };
}

async function parseExcelRows() {
  const file = await fs.readFile(workbookPath);
  const wb = XLSX.read(file, { type: "buffer", cellDates: true });
  const ws = wb.Sheets.Consolidado;

  if (!ws || !ws["!ref"]) {
    throw new Error("No se encontro la hoja 'Consolidado' en el Excel.");
  }

  const range = XLSX.utils.decode_range(ws["!ref"]);
  const rows = [];

  for (let row = 7; row <= range.e.r + 1; row += 1) {
    const mapped = mapExcelRow(ws, row);
    if (mapped) rows.push(mapped);
  }

  return rows;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }

  const rows = await parseExcelRows();
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const probe = await client.from(tableName).select("process_code", { count: "exact", head: true });
  if (probe.error) {
    throw new Error(
      `No existe la tabla ${tableName} o no es accesible. Ejecuta primero supabase/001_consolidado_schema.sql en SQL Editor. Detalle: ${probe.error.message}`,
    );
  }

  const { data: currentRows, error: currentError } = await client
    .from(tableName)
    .select("id, process_code");

  if (currentError) {
    throw new Error(`No se pudo leer el estado actual de ${tableName}: ${currentError.message}`);
  }

  const idByProcessCode = new Map();
  const duplicates = new Set();
  for (const row of currentRows ?? []) {
    const processCode = String(row.process_code ?? "").trim();
    if (!processCode) continue;
    if (idByProcessCode.has(processCode)) {
      duplicates.add(processCode);
      continue;
    }
    idByProcessCode.set(processCode, row.id);
  }

  if (duplicates.size > 0) {
    console.warn(`Aviso: se detectaron codigos de proceso duplicados en BD (${duplicates.size}).`);
  }

  let updated = 0;
  let inserted = 0;

  const chunkSize = 120;
  const rowsToUpdate = [];
  const rowsToInsert = [];

  for (const row of rows) {
    const processCode = String(row.process_code ?? "").trim();
    const existingId = idByProcessCode.get(processCode);
    if (existingId) {
      rowsToUpdate.push({ id: existingId, data: row });
    } else {
      rowsToInsert.push(row);
    }
  }

  for (let i = 0; i < rowsToUpdate.length; i += chunkSize) {
    const chunk = rowsToUpdate.slice(i, i + chunkSize);
    for (const item of chunk) {
      const { error } = await client
        .from(tableName)
        .update(item.data)
        .eq("id", item.id);

      if (error) {
        throw new Error(`Error actualizando codigo ${item.data.process_code}: ${error.message}`);
      }
      updated += 1;
    }
  }

  for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
    const chunk = rowsToInsert.slice(i, i + chunkSize);
    const { error } = await client.from(tableName).insert(chunk);
    if (error) {
      throw new Error(`Error insertando bloque nuevo ${i / chunkSize + 1}: ${error.message}`);
    }
    inserted += chunk.length;
  }

  const currentCodes = new Set((currentRows ?? []).map((row) => String(row.process_code ?? "").trim()).filter(Boolean));
  const incomingCodes = new Set(rows.map((row) => String(row.process_code ?? "").trim()).filter(Boolean));
  const missingInExcel = [...currentCodes].filter((code) => !incomingCodes.has(code));

  console.log(`Sincronizacion incremental completada desde: ${path.basename(workbookPath)}`);
  console.log(`- Filas leidas del Excel: ${rows.length}`);
  console.log(`- Programas actualizados: ${updated}`);
  console.log(`- Programas nuevos insertados: ${inserted}`);
  console.log(`- Programas existentes no presentes en este Excel: ${missingInExcel.length}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
