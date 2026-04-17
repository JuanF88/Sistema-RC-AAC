import ExcelJS from "exceljs";

type ExportRow = Record<string, unknown>;

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  formatter?: (value: unknown, row: ExportRow) => string | number;
}

export interface ExportSheet {
  sheetTitle: string;
  columns: ExportColumn[];
  data: ExportRow[];
}

type ExcelCellValue = string | number;

function estimateTextWidth(value: unknown): number {
  const text = String(value ?? "");
  if (!text) return 0;
  return text
    .split(/\r?\n/)
    .reduce((max, line) => Math.max(max, line.trim().length), 0);
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/?*\[\]:]/g, " ").trim().slice(0, 31) || "Hoja";
}

function triggerDownload(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function writeSheet(workbook: ExcelJS.Workbook, sheetTitle: string, columns: ExportColumn[], data: ExportRow[]): void {
  const worksheet = workbook.addWorksheet(sanitizeSheetName(sheetTitle), {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const contentWidths = new Map<string, number>();
  columns.forEach((column) => {
    const baseHeaderWidth = estimateTextWidth(column.header);
    const configuredMinimum = column.width ?? 12;
    contentWidths.set(column.key, Math.max(configuredMinimum, baseHeaderWidth + 2));
  });

  worksheet.columns = columns.map((column) => ({
    key: column.key,
    header: column.header,
    width: column.width ?? 20,
  }));

  const headerRow = worksheet.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FF93C5FD" } },
      left: { style: "thin", color: { argb: "FF93C5FD" } },
      bottom: { style: "thin", color: { argb: "FF93C5FD" } },
      right: { style: "thin", color: { argb: "FF93C5FD" } },
    };
  });

  data.forEach((rowData, index) => {
    const rowValues: Record<string, ExcelCellValue> = {};
    columns.forEach((column) => {
      const rawValue = rowData[column.key];
      const formatted = column.formatter ? column.formatter(rawValue, rowData) : rawValue;

      let cellValue: ExcelCellValue;
      if (formatted === null || formatted === undefined || formatted === "") {
        cellValue = "-";
      } else if (typeof formatted === "number" && Number.isFinite(formatted)) {
        cellValue = formatted;
      } else {
        cellValue = String(formatted);
      }

      rowValues[column.key] = cellValue;

      const currentWidth = contentWidths.get(column.key) ?? 12;
      const estimated = estimateTextWidth(cellValue) + 2;
      contentWidths.set(column.key, Math.max(currentWidth, estimated));
    });

    const row = worksheet.addRow(rowValues);
    row.height = 22;

    const stripeColor = index % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
    row.eachCell((cell) => {
      cell.font = { name: "Segoe UI", size: 10, color: { argb: "FF0F172A" } };
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stripeColor } };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };

  columns.forEach((column, index) => {
    const minWidth = column.width ?? 12;
    const fittedWidth = contentWidths.get(column.key) ?? minWidth;
    // Cap width to keep the workbook readable when a cell has very long text.
    worksheet.getColumn(index + 1).width = Math.min(70, Math.max(minWidth, fittedWidth));
  });
}

export async function exportToExcel(
  filename: string,
  sheetTitle: string,
  columns: ExportColumn[],
  data: ExportRow[],
  additionalSheets: ExportSheet[] = []
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema RC AAC";
  workbook.created = new Date();

  writeSheet(workbook, sheetTitle, columns, data);
  additionalSheets.forEach((sheet) => writeSheet(workbook, sheet.sheetTitle, sheet.columns, sheet.data));

  const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
  triggerDownload(buffer, filename);
}

/**
 * Función para formatear fechas
 */
export function formatDate(date: string | null | undefined): string {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return date;
  }
}

/**
 * Función para formatear estado RC
 */
export function formatRCStatus(rcEnd: string | null | undefined): string {
  if (!rcEnd) return 'Sin definir';
  const endDate = new Date(rcEnd);
  const today = new Date();
  return endDate < today ? 'Vencido' : 'Vigente';
}

/**
 * Función para formatear estado Acreditación
 */
export function formatAccreditationStatus(
  accredited: boolean | undefined,
  acreditable: boolean | undefined,
  inProcess: boolean | undefined
): string {
  if (accredited) return 'Acreditado';
  if (inProcess) return 'En proceso AAC';
  if (acreditable) return 'Acreditable';
  return 'Sin Acreditación';
}
