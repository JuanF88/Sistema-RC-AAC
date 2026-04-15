import fs from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const workbookArg = process.argv[2]?.trim();
const workbookPath = workbookArg
  ? path.resolve(process.cwd(), workbookArg)
  : path.join(process.cwd(), "Consolidado-RC AAC  GENERAL (4).xlsx");

const SHEET_NAME = "Visitas de Pares";
const TABLE_NAME = "visitas_pares";

function toIsoFromParts(year, month, day) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toIsoDate(value) {
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

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

async function parseVisitasRows() {
  const file = await fs.readFile(workbookPath);
  const workbook = XLSX.read(file, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[SHEET_NAME];

  if (!sheet) {
    throw new Error(`No se encontro la hoja '${SHEET_NAME}' en el Excel.`);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const headerIndex = rows.findIndex((row) => {
    if (!Array.isArray(row)) return false;
    return normalize(row[0]) === "programa" && normalize(row[1]).startsWith("fecha inicio");
  });

  if (headerIndex < 0) {
    throw new Error("No se pudo localizar la fila de encabezados en la hoja Visitas de Pares.");
  }

  const mapped = [];
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    const program = String(row[0] ?? "").trim();
    const startDate = toIsoDate(row[1]);
    const endDate = toIsoDate(row[2]);
    const subject = String(row[3] ?? "").trim();
    const modality = String(row[4] ?? "").trim();

    if (!program && !startDate && !endDate && !subject && !modality) continue;
    if (!program || !startDate || !endDate || !subject || !modality) continue;

    mapped.push({
      program,
      start_date: startDate,
      end_date: endDate,
      subject,
      modality,
    });
  }

  return mapped;
}

function buildKey(row) {
  return `${row.program}||${row.start_date}||${row.end_date}||${row.subject}||${row.modality}`;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const probe = await client.from(TABLE_NAME).select("id", { count: "exact", head: true });
  if (probe.error) {
    throw new Error(
      `No existe la tabla ${TABLE_NAME} o no es accesible. Ejecuta primero supabase/003_visitas_pares_schema.sql. Detalle: ${probe.error.message}`,
    );
  }

  const excelRows = await parseVisitasRows();

  const { data: currentRows, error: currentError } = await client
    .from(TABLE_NAME)
    .select("id, program, start_date, end_date, subject, modality");

  if (currentError) {
    throw new Error(`No se pudo leer el estado actual de ${TABLE_NAME}: ${currentError.message}`);
  }

  const existingMap = new Map();
  for (const row of currentRows ?? []) {
    const key = buildKey(row);
    if (!existingMap.has(key)) existingMap.set(key, row.id);
  }

  const toInsert = excelRows.filter((row) => !existingMap.has(buildKey(row)));

  let inserted = 0;
  const chunkSize = 200;
  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize);
    const { error } = await client.from(TABLE_NAME).insert(chunk);
    if (error) {
      throw new Error(`Error insertando visitas (bloque ${i / chunkSize + 1}): ${error.message}`);
    }
    inserted += chunk.length;
  }

  console.log(`Sincronizacion de visitas completada desde: ${path.basename(workbookPath)}`);
  console.log(`- Registros leidos en Excel: ${excelRows.length}`);
  console.log(`- Registros ya existentes: ${excelRows.length - toInsert.length}`);
  console.log(`- Registros nuevos insertados: ${inserted}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
