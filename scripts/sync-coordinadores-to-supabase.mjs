import fs from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const workbookArg = process.argv.find((arg) => !arg.startsWith("--") && arg !== process.argv[0] && arg !== process.argv[1]);
const shouldApply = process.argv.includes("--apply");

const workbookPath = workbookArg
  ? path.resolve(process.cwd(), workbookArg)
  : path.join(process.cwd(), "Base de Datos - Coordinadores.xlsx");

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeSnies(value) {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }

  const text = normalizeText(value).replace(/\s+/g, "");
  if (!text) return "";

  if (/^\d+(\.0+)?$/.test(text)) {
    return text.split(".")[0];
  }

  return text;
}

function normalizeEmail(email) {
  return normalizeText(email).toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function splitEmails(value) {
  return normalizeText(value)
    .split(/[;,\n]+/)
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

function mergeEmails(...emailLists) {
  const merged = new Set();
  for (const list of emailLists) {
    for (const email of list) {
      if (isValidEmail(email)) merged.add(email);
    }
  }
  return [...merged];
}

function parseRows(rawRows) {
  const groups = [];
  let current = null;

  for (const row of rawRows) {
    const program = normalizeText(row.PROGRAMA);
    const coordinator = normalizeText(row["COORDINADOR DE PROGRAMA"]);
    const emailRaw = normalizeText(row["CORREO PROGRAMA/ PERSONAL"]);
    const level = normalizeText(row["NIVEL DE ESTUDIOS"]);
    const location = normalizeText(row["LUGAR DE DESARROLLO"]);
    const snies = normalizeSnies(row.SNIES);

    const hasPrimaryData = Boolean(program || coordinator || level || location || snies);

    if (hasPrimaryData) {
      current = {
        program,
        coordinator,
        level,
        location,
        snies,
        emails: [],
      };
      groups.push(current);
    }

    if (!current) continue;

    if (emailRaw) {
      current.emails.push(...splitEmails(emailRaw));
    }
  }

  return groups
    .map((group) => ({
      ...group,
      emails: mergeEmails(group.emails),
    }))
    .filter((group) => group.snies || group.program);
}

function keyByProgram(group) {
  return `${group.program.toLowerCase()}|${group.location.toLowerCase()}|${group.level.toLowerCase()}`;
}

async function loadExcelGroups() {
  const file = await fs.readFile(workbookPath);
  const wb = XLSX.read(file, { type: "buffer" });
  const sheet = wb.Sheets.Coordinadores ?? wb.Sheets[wb.SheetNames[0]];

  if (!sheet) {
    throw new Error("No se encontro ninguna hoja en el archivo Excel.");
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return parseRows(rows);
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }

  const excelGroups = await loadExcelGroups();
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: dbRows, error: dbError } = await client
    .from("consolidado_programas")
    .select("id, program, snies, location, academic_level, program_coordinator, program_coordinator_email");

  if (dbError) {
    throw new Error(`No se pudo leer consolidado_programas: ${dbError.message}`);
  }

  const bySnies = new Map();
  const byProgramComposite = new Map();

  for (const row of dbRows ?? []) {
    const snies = normalizeSnies(row.snies);
    if (snies && !bySnies.has(snies)) {
      bySnies.set(snies, row);
    }

    const composite = `${normalizeText(row.program).toLowerCase()}|${normalizeText(row.location).toLowerCase()}|${normalizeText(row.academic_level).toLowerCase()}`;
    if (composite !== "||" && !byProgramComposite.has(composite)) {
      byProgramComposite.set(composite, row);
    }
  }

  const updates = [];
  const unmatched = [];

  for (const group of excelGroups) {
    const target = (group.snies ? bySnies.get(group.snies) : null) ?? byProgramComposite.get(keyByProgram(group));

    if (!target) {
      unmatched.push(group);
      continue;
    }

    const mergedEmails = mergeEmails(splitEmails(target.program_coordinator_email), group.emails);
    const nextCoordinator = group.coordinator || normalizeText(target.program_coordinator);

    const nextEmailText = mergedEmails.length > 0 ? mergedEmails.join("; ") : null;
    const currentEmailText = normalizeText(target.program_coordinator_email) || null;

    if (nextCoordinator === normalizeText(target.program_coordinator) && nextEmailText === currentEmailText) {
      continue;
    }

    updates.push({
      id: target.id,
      process: group,
      payload: {
        program_coordinator: nextCoordinator || null,
        program_coordinator_email: nextEmailText,
      },
    });
  }

  console.log(`Archivo: ${workbookPath}`);
  console.log(`Registros de Excel detectados: ${excelGroups.length}`);
  console.log(`Actualizaciones candidatas: ${updates.length}`);
  console.log(`No encontrados en BD: ${unmatched.length}`);

  if (unmatched.length > 0) {
    console.log("Muestra no encontrados (max 10):");
    for (const item of unmatched.slice(0, 10)) {
      console.log(`- SNIES=${item.snies || "(vacio)"} | PROGRAMA=${item.program || "(vacio)"} | NIVEL=${item.level || "(vacio)"}`);
    }
  }

  if (!shouldApply) {
    console.log("Modo simulacion (dry-run). Usa --apply para ejecutar cambios en BD.");
    return;
  }

  let applied = 0;
  for (const item of updates) {
    const { error } = await client
      .from("consolidado_programas")
      .update(item.payload)
      .eq("id", item.id);

    if (error) {
      throw new Error(`Error actualizando id ${item.id}: ${error.message}`);
    }

    applied += 1;
  }

  console.log(`Actualizaciones aplicadas: ${applied}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
