"use client";

import { useMemo, useState } from "react";

import type { ProgramRecord } from "../types";
import { formatDate } from "../utils";
import styles from "./styles/ConsolidadoMatrixView.module.css";

type Props = {
  rows: ProgramRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
};

type SortKey =
  | "processCode"
  | "snies"
  | "faculty"
  | "program"
  | "degree"
  | "level"
  | "modality"
  | "methodology"
  | "workday"
  | "location"
  | "totalAcademicCredits"
  | "duration"
  | "rcStart"
  | "rcEnd"
  | "rcSiga"
  | "rcMineducacion"
  | "acreditable"
  | "accredited"
  | "inAccreditationProcess"
  | "aacStart"
  | "aacEnd"
  | "aacImprovementHalfway"
  | "numberGraduates"
  | "generalObservations";

type SortDirection = "asc" | "desc";

type ColumnDef = {
  key: SortKey;
  label: string;
  width: number;
  render: (program: ProgramRecord) => string | number | boolean | null | undefined;
  sortable?: boolean;
};

const COLUMNS: ColumnDef[] = [
  { key: "processCode", label: "Código", width: 120, sortable: true, render: (program) => program.processCode },
  { key: "snies", label: "SNIES", width: 120, sortable: true, render: (program) => program.snies },
  { key: "faculty", label: "Facultad", width: 260, sortable: true, render: (program) => program.faculty },
  { key: "program", label: "Programa", width: 250, sortable: true, render: (program) => program.program },
  { key: "degree", label: "Título", width: 220, sortable: true, render: (program) => program.degree },
  { key: "level", label: "Nivel", width: 170, sortable: true, render: (program) => program.level },
  { key: "modality", label: "Modalidad", width: 180, sortable: true, render: (program) => program.modality },
  { key: "methodology", label: "Metodología", width: 200, sortable: true, render: (program) => program.methodology },
  { key: "workday", label: "Jornada", width: 150, sortable: true, render: (program) => program.workday },
  { key: "location", label: "Lugar", width: 180, sortable: true, render: (program) => program.location },
  { key: "totalAcademicCredits", label: "Créditos", width: 120, sortable: true, render: (program) => program.totalAcademicCredits },
  { key: "duration", label: "Duración", width: 110, sortable: true, render: (program) => program.duration },
  { key: "rcStart", label: "Inicio RC", width: 140, sortable: true, render: (program) => formatDate(program.rcStart) },
  { key: "rcEnd", label: "Vencimiento RC", width: 150, sortable: true, render: (program) => formatDate(program.rcEnd) },
  { key: "rcSiga", label: "RC SIGA", width: 140, sortable: true, render: (program) => formatDate(program.rcSiga) },
  { key: "rcMineducacion", label: "RC MinEdu", width: 150, sortable: true, render: (program) => formatDate(program.rcMineducacion) },
  { key: "acreditable", label: "Acreditable", width: 120, sortable: true, render: (program) => (program.acreditable ? "Sí" : "") },
  { key: "accredited", label: "Acreditado", width: 110, sortable: true, render: (program) => (program.accredited ? "Sí" : "") },
  { key: "inAccreditationProcess", label: "Proceso AAC", width: 130, sortable: true, render: (program) => (program.inAccreditationProcess ? "Sí" : "") },
  { key: "aacStart", label: "Inicio AAC", width: 140, sortable: true, render: (program) => formatDate(program.aacStart) },
  { key: "aacEnd", label: "Vencimiento AAC", width: 150, sortable: true, render: (program) => formatDate(program.aacEnd) },
  { key: "aacImprovementHalfway", label: "Mitad Vigencia AAC", width: 170, sortable: true, render: (program) => formatDate(program.aacImprovementHalfway) },
  { key: "numberGraduates", label: "Egresados", width: 110, sortable: true, render: (program) => program.numberGraduates },
  { key: "generalObservations", label: "Observaciones", width: 340, sortable: true, render: (program) => program.generalObservations },
];

export function ConsolidadoMatrixView({ rows, selectedId, onSelect, onOpen }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("faculty");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleRowClick = (id: string) => {
    if (selectedId === id) {
      onOpen(id);
      return;
    }
    onSelect(id);
  };

  const displayValue = (value: string | number | boolean | null | undefined) => {
    if (value === null || value === undefined || value === "") return "-";
    return value;
  };

  const sortedRows = useMemo(() => {
    const column = COLUMNS.find((item) => item.key === sortKey);
    if (!column) return rows;

    const normalize = (value: unknown): string | number => {
      if (value === null || value === undefined) return "";
      if (typeof value === "number") return value;
      if (typeof value === "boolean") return value ? 1 : 0;
      const asString = String(value).trim();
      const parsedNumber = Number(asString);
      return Number.isFinite(parsedNumber) && asString !== "" ? parsedNumber : asString.toLowerCase();
    };

    return [...rows].sort((left, right) => {
      const leftValue = normalize(column.render(left));
      const rightValue = normalize(column.render(right));

      let comparison = 0;
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        comparison = leftValue - rightValue;
      } else {
        comparison = String(leftValue).localeCompare(String(rightValue), "es", { sensitivity: "base" });
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [rows, sortDirection, sortKey]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      // Misma columna: alterna la dirección entre asc y desc
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Columna diferente: comienza con ordenamiento ascendente
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.scroller}>
        <table className={styles.table}>
          <colgroup>
            {COLUMNS.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead className={styles.head}>
            <tr>
              {COLUMNS.map((column) => (
                <th key={column.key} className={styles.headerCell}>
                  <button type="button" className={styles.sortButton} onClick={() => handleSort(column.key)}>
                    <span>{column.label}</span>
                    <span className={styles.sortIndicator}>{sortKey === column.key ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((program) => (
              <tr
                key={program.id}
                onClick={() => handleRowClick(program.id)}
                className={selectedId === program.id ? styles.selectedRow : undefined}
              >
                {COLUMNS.map((column) => {
                  const value = column.render(program);
                  if (column.key === "processCode" || column.key === "program") {
                    return (
                      <td key={column.key} className={styles.strong} title={String(displayValue(value))}>
                        {displayValue(value)}
                      </td>
                    );
                  }

                  if (column.key === "generalObservations") {
                    return (
                      <td key={column.key} className={styles.observations} title={String(displayValue(value))}>
                        {displayValue(value)}
                      </td>
                    );
                  }

                  return (
                    <td key={column.key} className={styles.cell} title={String(displayValue(value))}>
                      {displayValue(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className={styles.empty}>No hay programas para ese filtro.</p>}
    </div>
  );
}
