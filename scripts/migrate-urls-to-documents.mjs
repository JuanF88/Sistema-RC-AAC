import fs from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

// Cargar variables de entorno desde .env.local
const envPath = path.join(process.cwd(), ".env.local");
const envContent = await fs.readFile(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const [key, ...valueParts] = trimmed.split("=");
    const value = valueParts.join("=").replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
}

const workbookPath = path.join(process.cwd(), "Consolidado-RC AAC  GENERAL (3).xlsx");
const tableName = "consolidado_programas";
const documentsTableName = "consolidado_documentos";

const URL_COLUMNS = {
  Y: { columnLetter: "Y", name: "Reforma Consejo Académico" },
  AA: { columnLetter: "AA", name: "Reforma MinEducación" },
  AD: { columnLetter: "AD", name: "Resolución R.C." },
  AU: { columnLetter: "AU", name: "Resolución Acreditación A.C." },
};

function isValidUrl(value) {
  if (!value) return false;
  const trimmed = String(value).trim();
  if (!trimmed) return false;

  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

function extractUrlFromCell(cell) {
  if (!cell) return null;

  // 1) Hipervinculo nativo de Excel
  const hyperlinkTarget = cell?.l?.Target;
  if (isValidUrl(hyperlinkTarget)) return String(hyperlinkTarget).trim();

  // 2) Valor visible / crudo de la celda
  const directValue = cell?.v;
  if (isValidUrl(directValue)) return String(directValue).trim();

  const formattedValue = cell?.w;
  if (isValidUrl(formattedValue)) return String(formattedValue).trim();

  // 3) Formula HYPERLINK("url", "texto")
  const formula = String(cell?.f ?? "");
  const hyperlinkMatch = formula.match(/HYPERLINK\("([^"]+)"/i);
  if (hyperlinkMatch && isValidUrl(hyperlinkMatch[1])) {
    return hyperlinkMatch[1].trim();
  }

  return null;
}

function extractUrls(ws, row) {
  const val = (col) => ws[`${col}${row}`]?.v;
  const cell = (col) => ws[`${col}${row}`];
  const urls = [];

  // Obtener el código de proceso para identificar el programa
  const processCode = String(val("B") ?? "").trim();
  if (!processCode) return null;

  // Extraer URLs de cada columna
  for (const [colLetter, colInfo] of Object.entries(URL_COLUMNS)) {
    const parsedUrl = extractUrlFromCell(cell(colLetter));
    if (parsedUrl) {
      urls.push({
        processCode,
        name: colInfo.name,
        url: parsedUrl,
      });
    }
  }

  return urls.length > 0 ? { processCode, urls } : null;
}

async function parseExcelUrls() {
  const file = await fs.readFile(workbookPath);
  const wb = XLSX.read(file, { type: "buffer", cellDates: true });
  const ws = wb.Sheets.Consolidado;

  if (!ws || !ws["!ref"]) {
    throw new Error("No se encontró la hoja 'Consolidado' en el Excel.");
  }

  const range = XLSX.utils.decode_range(ws["!ref"]);
  const urlsData = [];

  for (let row = 7; row <= range.e.r + 1; row++) {
    const extracted = extractUrls(ws, row);
    if (extracted) {
      urlsData.push(extracted);
    }
  }

  return urlsData;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }

  console.log("🔍 Extrayendo URLs del Excel...");
  const urlsData = await parseExcelUrls();
  console.log(`✅ Se encontraron ${urlsData.length} programas con URLs\n`);

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Verificar que la tabla de documentos existe
  const probe = await client.from(documentsTableName).select("id", { count: "exact", head: true });
  if (probe.error) {
    throw new Error(
      `No existe la tabla ${documentsTableName}. Detalle: ${probe.error.message}`,
    );
  }

  let totalUrlsInserted = 0;
  const failedPrograms = [];

  // Procesar cada programa con URLs
  for (const { processCode, urls } of urlsData) {
    // Buscar el programa para obtener su ID
    const { data: programs, error: searchError } = await client
      .from(tableName)
      .select("id")
      .eq("process_code", processCode)
      .limit(1);

    if (searchError || !programs || programs.length === 0) {
      failedPrograms.push(processCode);
      console.warn(`⚠️  No se encontró programa con código: ${processCode}`);
      continue;
    }

    const programId = programs[0].id;

    // Insertar cada URL
    for (const { name, url } of urls) {
      const { data: existingDoc, error: existingDocError } = await client
        .from(documentsTableName)
        .select("id")
        .eq("program_id", programId)
        .eq("name", name)
        .eq("url", url)
        .limit(1)
        .maybeSingle();

      if (existingDocError) {
        console.warn(`⚠️  Error validando duplicado para ${processCode}: ${existingDocError.message}`);
        continue;
      }

      if (existingDoc) {
        continue;
      }

      const { error: insertError } = await client
        .from(documentsTableName)
        .insert({
          program_id: programId,
          name,
          source_type: "url",
          url,
          storage_path: null,
        });

      if (insertError) {
        console.warn(`⚠️  Error insertando URL "${name}" para ${processCode}: ${insertError.message}`);
      } else {
        totalUrlsInserted++;
        console.log(`✓ URL insertada: ${processCode} → ${name}`);
      }
    }
  }

  console.log(`\n✅ Migración completada:`);
  console.log(`   - URLs insertadas: ${totalUrlsInserted}`);
  console.log(`   - Programas con errores: ${failedPrograms.length}`);
  if (failedPrograms.length > 0) {
    console.log(`   - Códigos fallidos: ${failedPrograms.join(", ")}`);
  }
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
