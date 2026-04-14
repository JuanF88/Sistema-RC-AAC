import fs from "node:fs";
import * as XLSX from "xlsx";

const wb = XLSX.read(fs.readFileSync("Consolidado-RC AAC  GENERAL (3).xlsx"));
const ws = wb.Sheets.Consolidado;

if (!ws || !ws["!ref"]) {
  throw new Error("No existe hoja Consolidado");
}

const range = XLSX.utils.decode_range(ws["!ref"]);
const colsToCheck = ["AB", "AC", "AD", "AE", "AF", "AU"];

function extractUrl(cell) {
  if (!cell) return null;

  const hyperlink = cell?.l?.Target;
  if (hyperlink && /^https?:\/\//i.test(String(hyperlink))) return String(hyperlink);

  const raw = cell?.v;
  if (raw && /^https?:\/\//i.test(String(raw).trim())) return String(raw).trim();

  const formula = String(cell?.f ?? "");
  const m = formula.match(/HYPERLINK\("([^"]+)"/i);
  if (m?.[1] && /^https?:\/\//i.test(m[1])) return m[1].trim();

  return null;
}

console.log("Encabezados fila 6:\n");
for (const col of colsToCheck) {
  console.log(`${col}: ${String(ws[`${col}6`]?.v ?? "")}`);
}

console.log("\nConteos por columna:\n");
for (const col of colsToCheck) {
  let rowsWithValue = 0;
  let rowsWithUrl = 0;
  const sampleValues = [];
  const sampleUrls = [];

  for (let row = 7; row <= range.e.r + 1; row += 1) {
    const cell = ws[`${col}${row}`];
    if (cell && cell.v !== undefined && String(cell.v).trim() !== "") {
      rowsWithValue += 1;
      if (sampleValues.length < 5) sampleValues.push(String(cell.v));
    }

    const url = extractUrl(cell);
    if (url) {
      rowsWithUrl += 1;
      if (sampleUrls.length < 5) sampleUrls.push(url);
    }
  }

  console.log(`${col} -> valores: ${rowsWithValue}, urls: ${rowsWithUrl}`);
  if (sampleValues.length > 0) console.log(`  ejemplos valor: ${sampleValues.join(" | ")}`);
  if (sampleUrls.length > 0) console.log(`  ejemplos url: ${sampleUrls.join(" | ")}`);
}
