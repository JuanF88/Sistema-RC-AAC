"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import { exportToExcel, type ExportColumn } from "@/lib/export";
import type { ProgramRecord } from "../types";
import styles from "./styles/RegistroCalificadoView.module.css";
import type { RegistroCalificadoGroupingMode } from "../types";

type Props = {
  rows: ProgramRecord[];
  groupingMode: RegistroCalificadoGroupingMode;
  onExportReady?: (action: (() => Promise<void>) | null) => void;
};

type LevelBucket = "tecn" | "pregrado" | "esp" | "espMedQuir" | "maestria" | "doctorado";

const LEVEL_COLUMNS: Array<{ key: LevelBucket; label: string }> = [
  { key: "tecn", label: "Tecnología" },
  { key: "pregrado", label: "Pregrado" },
  { key: "esp", label: "Especialización" },
  { key: "espMedQuir", label: "Esp. Méd. Quir." },
  { key: "maestria", label: "Maestrías" },
  { key: "doctorado", label: "Doctorado" },
];

function normalizeLevel(program: ProgramRecord): LevelBucket | null {
  const text = `${program.academicLevel ?? ""} ${program.level ?? ""}`.toLowerCase();

  if (text.includes("doctor")) return "doctorado";
  if (text.includes("maestr")) return "maestria";
  if (text.includes("quir")) return "espMedQuir";
  if (text.includes("especial")) return "esp";
  if (text.includes("tecn")) return "tecn";
  if (text.includes("pregrado") || text.includes("universit") || text.includes("profesional") || text.includes("licenci") || text.includes("ingenier") || text.includes("arquitect")) {
    return "pregrado";
  }

  return null;
}

function formatPercent(value: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function isPregrado(bucket: LevelBucket | null) {
  return bucket === "tecn" || bucket === "pregrado";
}

function isPosgrado(bucket: LevelBucket | null) {
  return bucket === "esp" || bucket === "espMedQuir" || bucket === "maestria" || bucket === "doctorado";
}

function buildSummary(rows: ProgramRecord[]) {
  const counts: Record<LevelBucket, number> = {
    tecn: 0,
    pregrado: 0,
    esp: 0,
    espMedQuir: 0,
    maestria: 0,
    doctorado: 0,
  };

  for (const program of rows) {
    const bucket = normalizeLevel(program);
    if (bucket) {
      counts[bucket] += 1;
    }
  }

  const totalPrograms = rows.length;
  const totalPregrado = counts.tecn + counts.pregrado;
  const totalPosgrado = counts.esp + counts.espMedQuir + counts.maestria + counts.doctorado;

  return { counts, totalPrograms, totalPregrado, totalPosgrado };
}

function buildFacultyRows(rows: ProgramRecord[]) {
  const map = new Map<
    string,
    {
      faculty: string;
      programs: number;
      counts: Record<LevelBucket, number>;
    }
  >();

  for (const program of rows) {
    const current = map.get(program.faculty) ?? {
      faculty: program.faculty,
      programs: 0,
      counts: {
        tecn: 0,
        pregrado: 0,
        esp: 0,
        espMedQuir: 0,
        maestria: 0,
        doctorado: 0,
      },
    };

    current.programs += 1;
    const bucket = normalizeLevel(program);
    if (bucket) {
      current.counts[bucket] += 1;
    }

    map.set(program.faculty, current);
  }

  return [...map.values()].sort((left, right) => left.faculty.localeCompare(right.faculty, "es", { sensitivity: "base" }));
}

function buildProgramRows(rows: ProgramRecord[]) {
  return [...rows].sort((left, right) =>
    left.faculty === right.faculty
      ? left.program.localeCompare(right.program, "es", { sensitivity: "base" })
      : left.faculty.localeCompare(right.faculty, "es", { sensitivity: "base" }),
  );
}

export function RegistroCalificadoView({ rows, groupingMode, onExportReady }: Props) {
  const summary = useMemo(() => buildSummary(rows), [rows]);
  const programRows = useMemo(() => buildProgramRows(rows), [rows]);
  const facultyRows = useMemo(() => buildFacultyRows(rows), [rows]);
  const useFacultyGrouping = groupingMode === "facultades";

  const renderLevelValue = (program: ProgramRecord, key: LevelBucket) => {
    const bucket = normalizeLevel(program);
    return bucket === key ? "1" : "";
  };

  const footerPregrado = `${summary.totalPregrado} (${formatPercent(summary.totalPregrado, summary.totalPrograms)})`;
  const footerPosgrado = `${summary.totalPosgrado} (${formatPercent(summary.totalPosgrado, summary.totalPrograms)})`;

  // Keep reference to current data for export
  const dataRef = useRef({ facultyRows, programRows, useFacultyGrouping });
  useEffect(() => {
    dataRef.current = { facultyRows, programRows, useFacultyGrouping };
  }, [facultyRows, programRows, useFacultyGrouping]);

  const handleExport = useCallback(async () => {
    const timestamp = new Date().toLocaleDateString("es-CO");
    const data = dataRef.current;
    const modeLabel = data.useFacultyGrouping ? "Facultades" : "Programas";
    const filename = `Registro-Calificado-${modeLabel}-${timestamp}`;

    const columns: ExportColumn[] = [
      { key: "faculty", header: "Facultad", width: 30 },
      { key: data.useFacultyGrouping ? "programCount" : "program", header: data.useFacultyGrouping ? "Programas" : "Programa", width: data.useFacultyGrouping ? 14 : 36 },
      ...(data.useFacultyGrouping ? [] : [{ key: "level", header: "Nivel", width: 20 }]),
      ...LEVEL_COLUMNS.map((column) => ({ key: column.key, header: column.label, width: 14 })),
      { key: "totalPregrado", header: "Total Pregrado", width: 16 },
      { key: "totalPosgrado", header: "Total Posgrado", width: 16 },
      { key: "total", header: "Total", width: 12 },
    ];

    const exportData = data.useFacultyGrouping
      ? data.facultyRows.map((row) => {
          const totalPregrado = row.counts.tecn + row.counts.pregrado;
          const totalPosgrado = row.counts.esp + row.counts.espMedQuir + row.counts.maestria + row.counts.doctorado;
          return {
            faculty: row.faculty,
            programCount: row.programs,
            tecn: row.counts.tecn,
            pregrado: row.counts.pregrado,
            esp: row.counts.esp,
            espMedQuir: row.counts.espMedQuir,
            maestria: row.counts.maestria,
            doctorado: row.counts.doctorado,
            totalPregrado,
            totalPosgrado,
            total: row.programs,
          };
        })
      : data.programRows.map((program) => {
          const bucket = normalizeLevel(program);
          const pregrado = isPregrado(bucket) ? 1 : 0;
          const posgrado = isPosgrado(bucket) ? 1 : 0;
          return {
            faculty: program.faculty,
            program: program.program,
            level: program.academicLevel ?? program.level ?? "-",
            tecn: bucket === "tecn" ? 1 : "",
            pregrado: bucket === "pregrado" ? 1 : "",
            esp: bucket === "esp" ? 1 : "",
            espMedQuir: bucket === "espMedQuir" ? 1 : "",
            maestria: bucket === "maestria" ? 1 : "",
            doctorado: bucket === "doctorado" ? 1 : "",
            totalPregrado: pregrado || "",
            totalPosgrado: posgrado || "",
            total: 1,
          };
        });

    await exportToExcel(filename, `Registro ${modeLabel}`, columns, exportData);
  }, []);

  useEffect(() => {
    if (!onExportReady) return;
    onExportReady(handleExport);
    return () => onExportReady(null);
  }, [onExportReady]);

  return (
    <div className={styles.wrap}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <colgroup>
            {useFacultyGrouping ? (
              <>
                <col style={{ width: 300 }} />
                <col style={{ width: 120 }} />
              </>
            ) : (
              <>
                <col style={{ width: 260 }} />
                <col style={{ width: 2300 }} />
                <col style={{ width: 160 }} />
              </>
            )}
            <col style={{ width: 120 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 170 }} />
            <col style={{ width: 180 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 160 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 110 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Facultad</th>
              {useFacultyGrouping ? <th>Programas</th> : <th>Programa</th>}
              {!useFacultyGrouping && <th>Nivel</th>}
              {LEVEL_COLUMNS.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              <th>Total Pregrado</th>
              <th>Total Posgrado</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {useFacultyGrouping
              ? facultyRows.map((row) => {
                  const totalPregrado = row.counts.tecn + row.counts.pregrado;
                  const totalPosgrado = row.counts.esp + row.counts.espMedQuir + row.counts.maestria + row.counts.doctorado;

                  return (
                    <tr key={row.faculty}>
                      <td className={styles.facultyCell} title={row.faculty}>
                        {row.faculty}
                      </td>
                      <td className={styles.programCell}>{row.programs}</td>
                      {LEVEL_COLUMNS.map((column) => (
                        <td key={column.key} className={styles.numericCell}>
                          {row.counts[column.key] || ""}
                        </td>
                      ))}
                      <td className={styles.numericCell}>{totalPregrado || ""}</td>
                      <td className={styles.numericCell}>{totalPosgrado || ""}</td>
                      <td className={styles.numericCell}>{row.programs}</td>
                    </tr>
                  );
                })
              : programRows.map((program) => {
                  const bucket = normalizeLevel(program);
                  const pregrado = isPregrado(bucket) ? 1 : 0;
                  const posgrado = isPosgrado(bucket) ? 1 : 0;

                  return (
                    <tr key={program.id}>
                      <td className={styles.facultyCell} title={program.faculty}>
                        {program.faculty}
                      </td>
                      <td className={styles.programCell} title={program.program}>
                        {program.program}
                      </td>
                      <td className={styles.levelCell} title={program.academicLevel ?? program.level ?? ""}>
                        {program.academicLevel ?? program.level ?? "-"}
                      </td>
                      {LEVEL_COLUMNS.map((column) => (
                        <td key={column.key} className={styles.numericCell}>
                          {renderLevelValue(program, column.key)}
                        </td>
                      ))}
                      <td className={styles.numericCell}>{pregrado || ""}</td>
                      <td className={styles.numericCell}>{posgrado || ""}</td>
                      <td className={styles.numericCell}>1</td>
                    </tr>
                  );
                })}
          </tbody>
          <tfoot>
            <tr>
              <td className={styles.footerLabel} colSpan={useFacultyGrouping ? 2 : 3}>
                Consolidado
              </td>
              {LEVEL_COLUMNS.map((column) => (
                <td key={column.key} className={styles.footerCell}>
                  {formatPercent(summary.counts[column.key], summary.totalPrograms)}
                </td>
              ))}
              <td className={styles.footerCell}>{footerPregrado}</td>
              <td className={styles.footerCell}>{footerPosgrado}</td>
              <td className={styles.footerCell}>{summary.totalPrograms}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {rows.length === 0 && <p className={styles.empty}>No hay programas para mostrar en este reporte.</p>}
    </div>
  );
}
