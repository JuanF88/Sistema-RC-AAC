import fs from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const workbookPath = path.join(process.cwd(), "Consolidado-RC AAC  GENERAL (3).xlsx");
const tableName = "consolidado_programas";

function toIsoDate(value) {
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

  const direct = new Date(String(value));
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString().slice(0, 10);
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

  const processCode = String(val("B") ?? "").trim();
  const faculty = String(val("C") ?? "").trim();
  const program = String(val("D") ?? "").trim();

  if (!processCode || !faculty || !program) return null;

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
    process_code: processCode,
    snies: String(val("G") ?? "").trim() || null,
    faculty,
    program,
    degree: String(val("E") ?? "").trim() || null,
    location: String(val("N") ?? "").trim() || null,
    level: String(val("R") ?? "").trim() || null,
    modality: String(val("S") ?? "").trim() || null,
    rc_start: rcStart,
    rc_duration_years: rcDurationYears,
    rc_end: rcEnd,
    rrc_siga: rrcSiga,
    rrc_mineducacion: rrcMineducacion,
    has_current_rc: rcEnd ? new Date(rcEnd).getTime() > Date.now() : null,
    acreditable: toYesNo(val("AR")),
    accredited: toYesNo(val("AS")),
    in_accreditation_process: toYesNo(val("AT")) || String(val("AT") ?? "").trim().length > 0,
    aac_start: aacStart,
    aac_duration_years: aacDurationYears,
    aac_end: aacEnd,
    improvement_halfway: improvementHalfway,
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

  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await client
      .from(tableName)
      .upsert(chunk, { onConflict: "process_code,snies", ignoreDuplicates: false });

    if (error) {
      throw new Error(`Error insertando bloque ${i / chunkSize + 1}: ${error.message}`);
    }
  }

  console.log(`Sincronizacion completada: ${rows.length} programas en ${tableName}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
