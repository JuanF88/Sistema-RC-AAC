"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";

import type { ProgramRecord } from "../types";
import { formatDate } from "../utils";
import { exportToExcel, type ExportColumn } from "@/lib/export";
import styles from "./styles/ConsolidadoMatrixView.module.css";

type Props = {
  rows: ProgramRecord[];
  selectedId: string | null;
  onExportReady?: (action: (() => Promise<void>) | null) => void;
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

type ExportMatrixColumn = {
  key: string;
  header: string;
  width: number;
  getValue: (program: ProgramRecord) => string | number | boolean | null | undefined;
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

const FULL_EXPORT_COLUMNS: ExportMatrixColumn[] = [
  { key: "processCode", header: "Codigo\nProceso", width: 16, getValue: (program) => program.processCode },
  { key: "faculty", header: "Facultad", width: 28, getValue: (program) => program.faculty },
  { key: "program", header: "Programa", width: 34, getValue: (program) => program.program },
  { key: "degree", header: "Titulo otorgado", width: 26, getValue: (program) => program.degree },
  { key: "creationAgreement", header: "Acuerdo de Creacion\nConsejo Superior", width: 28, getValue: (program) => program.creationAgreement },
  { key: "snies", header: "SNIES", width: 14, getValue: (program) => program.snies },
  { key: "noRenewal", header: "No Renovacion", width: 18, getValue: (program) => program.noRenewal },
  { key: "authorizedAdmissionsMen", header: "Numero de Admitidos autorizados por el MEN", width: 22, getValue: (program) => program.authorizedAdmissionsMen },
  { key: "admissionPeriodicity", header: "Periodicidad del admision", width: 20, getValue: (program) => program.admissionPeriodicity },
  { key: "agreementCode", header: "Convenio", width: 18, getValue: (program) => program.agreementCode },
  { key: "agreementIes", header: "IES en Convenio", width: 20, getValue: (program) => program.agreementIes },
  { key: "agreementAdministrator", header: "Administrador\nde convenio", width: 22, getValue: (program) => program.agreementAdministrator },
  { key: "location", header: "Lugar de Desarrollo", width: 24, getValue: (program) => program.location },
  { key: "workday", header: "Jornada", width: 14, getValue: (program) => program.workday },
  { key: "regionalized", header: "Regionalizado", width: 14, getValue: (program) => (program.regionalized ? "Si" : "No") },
  { key: "academicLevel", header: "Nivel de formacion\nacademico", width: 22, getValue: (program) => program.academicLevel },
  { key: "level", header: "Nivel\nacademico", width: 18, getValue: (program) => program.level },
  { key: "modality", header: "Modalidad", width: 16, getValue: (program) => program.modality },
  { key: "methodology", header: "Metodologia", width: 18, getValue: (program) => program.methodology },
  { key: "researchCredits", header: "Creditos\nInvestigacion", width: 16, getValue: (program) => program.researchCredits },
  { key: "deepeningCredits", header: "Creditos\nProfundizacion", width: 18, getValue: (program) => program.deepeningCredits },
  { key: "totalAcademicCredits", header: "Total Creditos\nAcademicos", width: 18, getValue: (program) => program.totalAcademicCredits },
  { key: "duration", header: "Duracion", width: 12, getValue: (program) => program.duration },
  { key: "reformAcademicCouncil", header: "Reforma\nConsejo Academico", width: 20, getValue: (program) => program.reformAcademicCouncil },
  { key: "reformSuperiorCouncil", header: "Reforma\nConsejo Superior", width: 20, getValue: (program) => program.reformSuperiorCouncil },
  { key: "reformMineducacion", header: "Reforma\nMinEducacion", width: 20, getValue: (program) => program.reformMineducacion },
  { key: "ticPercentage", header: "% TIC", width: 12, getValue: (program) => program.ticPercentage },
  { key: "hasCurrentRc", header: "Con R.C.", width: 12, getValue: (program) => (program.hasCurrentRc === null ? "" : program.hasCurrentRc ? "Si" : "No") },
  { key: "rcResolution", header: "Resolucion\nR.C.", width: 18, getValue: (program) => program.rcResolution },
  { key: "rcResolutionCopy", header: "Resolucion\nR.C.", width: 18, getValue: (program) => program.rcResolution },
  { key: "rcStart", header: "Inicio R.C.", width: 14, getValue: (program) => formatDate(program.rcStart) },
  { key: "rcDurationYears", header: "Duracion\n(anos)", width: 12, getValue: (program) => program.rcDurationYears },
  { key: "rcSiga", header: "SiGA RRC\n(14 meses antes)", width: 18, getValue: (program) => formatDate(program.rcSiga) },
  { key: "rcMineducacion", header: "Plazo Radicacion RRC\nante MinEducacion\n(12 meses antes)", width: 24, getValue: (program) => formatDate(program.rcMineducacion) },
  { key: "rcEnd", header: "Vencimiento\nR.C.", width: 16, getValue: (program) => formatDate(program.rcEnd) },
  { key: "rcExtensionDecree1330", header: "Extension Decreto 1330 de 2019", width: 22, getValue: (program) => formatDate(program.rcExtensionDecree1330) },
  { key: "rcExtensionDecree1174", header: "Vencimiento de R.C con Extension decreto 1174 de 2023", width: 26, getValue: (program) => formatDate(program.rcExtensionDecree1174) },
  { key: "rcHistoricalResolutions", header: "Historico\nResoluciones R.C.", width: 24, getValue: (program) => program.rcHistoricalResolutions },
  { key: "rcResolutionCount", header: "Cantidad\nRes/Ren R.C.", width: 14, getValue: (program) => program.rcResolutionCount },
  { key: "rcOfficialResolution", header: "Resolucion R.C.\nde Oficio", width: 20, getValue: (program) => program.rcOfficialResolution },
  { key: "rcDeniedResolution", header: "Resolucion R.C.\nNegada", width: 20, getValue: (program) => program.rcDeniedResolution },
  { key: "numberGraduates", header: "Numero\nEgresados", width: 14, getValue: (program) => program.numberGraduates },
  { key: "acreditable", header: "Acreditable", width: 12, getValue: (program) => (program.acreditable ? "Si" : "No") },
  { key: "accredited", header: "Acreditado", width: 12, getValue: (program) => (program.accredited ? "Si" : "No") },
  { key: "inAccreditationProcess", header: "En Proceso de\nAcreditacion", width: 18, getValue: (program) => (program.inAccreditationProcess ? "Si" : "No") },
  { key: "aacResolution", header: "Resolucion\nAcreditacion A.C.", width: 20, getValue: (program) => program.aacResolution },
  { key: "aacStart", header: "Inicio A.A.C.", width: 14, getValue: (program) => formatDate(program.aacStart) },
  { key: "aacDurationYears", header: "Duracion\n(anos)", width: 12, getValue: (program) => program.aacDurationYears },
  { key: "aacCgcaiDelivery", header: "Entrega al CGCAI\n(14 meses antes)", width: 20, getValue: (program) => formatDate(program.aacCgcaiDelivery) },
  { key: "aacMineducacionFiling", header: "Plazo Radicacion AAC\nante MinEducacion\n(1 ano antes)", width: 24, getValue: (program) => formatDate(program.aacMineducacionFiling) },
  { key: "aacEnd", header: "Vencimiento\nA.A.C.", width: 16, getValue: (program) => formatDate(program.aacEnd) },
  { key: "aacImprovementHalfway", header: "Mitad Vigencia de Acreditacion\n(Plan de Mejora)", width: 24, getValue: (program) => formatDate(program.aacImprovementHalfway) },
  { key: "aacHistoricalResolutions", header: "Historico\nResoluciones AAC", width: 24, getValue: (program) => program.aacHistoricalResolutions },
  { key: "aacResolutionCount", header: "Cantidad\nRes. AAC", width: 14, getValue: (program) => program.aacResolutionCount },
  { key: "aacDeniedResolution", header: "Resolucion AAC\nNegada", width: 20, getValue: (program) => program.aacDeniedResolution },
  { key: "accreditationGuideline", header: "Lineamiento Acreditacion", width: 22, getValue: (program) => program.accreditationGuideline },
  { key: "generalObservations", header: "Observaciones\nGenerales", width: 26, getValue: (program) => program.generalObservations },
  { key: "programCoordinator", header: "Coordinador\nde Programa", width: 22, getValue: (program) => program.programCoordinator },
  { key: "programCoordinatorEmail", header: "Correo\ndel Coordinador", width: 24, getValue: (program) => program.programCoordinatorEmail },
  { key: "programCoordinatorTitle", header: "Titulo\ndel Coordinador", width: 22, getValue: (program) => program.programCoordinatorTitle },
  { key: "observacionesAlertaRrc", header: "Observaciones\nalerta RRC", width: 26, getValue: (program) => program.observacionesAlertaRrc },
  { key: "observacionesAlertaAcreditados", header: "Observaciones\nalerta acreditados", width: 26, getValue: (program) => program.observacionesAlertaAcreditados },
];

const VISIBLE_EXPORT_COLUMNS: ExportColumn[] = COLUMNS.map((col) => ({
  key: col.key,
  header: col.label,
  width: Math.max(14, Math.round(col.width / 10)),
  formatter: (value) => {
    if (value === null || value === undefined || value === "") return "-";
    return String(value);
  },
}));

export function ConsolidadoMatrixView({ rows, selectedId, onExportReady, onSelect, onOpen }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("faculty");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  
  // Keep references to current sort state for export without recreating handleExport
  const sortStateRef = useRef({ sortDirection, sortKey, rows });
  useEffect(() => {
    sortStateRef.current = { sortDirection, sortKey, rows };
  }, [sortDirection, sortKey, rows]);

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

  // handleExport doesn't depend on sortDirection/sortKey directly - uses ref
  const handleExport = useCallback(async () => {
    const timestamp = new Date().toLocaleDateString("es-CO");
    const filename = `Consolidado-Programas-${timestamp}`;

    // Calculate sorted rows using current state from ref
    const state = sortStateRef.current;
    const column = COLUMNS.find((item) => item.key === state.sortKey);
    
    const normalize = (value: unknown): string | number => {
      if (value === null || value === undefined) return "";
      if (typeof value === "number") return value;
      if (typeof value === "boolean") return value ? 1 : 0;
      const asString = String(value).trim();
      const parsedNumber = Number(asString);
      return Number.isFinite(parsedNumber) && asString !== "" ? parsedNumber : asString.toLowerCase();
    };

    const exportRowsBase = state.rows.filter((program) => program.isActive === true);
    let exportRows = exportRowsBase;
    if (column) {
      exportRows = [...exportRowsBase].sort((left, right) => {
        const leftValue = normalize(column.render(left));
        const rightValue = normalize(column.render(right));

        let comparison = 0;
        if (typeof leftValue === "number" && typeof rightValue === "number") {
          comparison = leftValue - rightValue;
        } else {
          comparison = String(leftValue).localeCompare(String(rightValue), "es", { sensitivity: "base" });
        }

        return state.sortDirection === "asc" ? comparison : -comparison;
      });
    }

    const visibleExportData = exportRows.map((program) => ({
      ...Object.fromEntries(COLUMNS.map((col) => [col.key, col.render(program)])),
    }));

    const fullExportColumns: ExportColumn[] = FULL_EXPORT_COLUMNS.map((col) => ({
      key: col.key,
      header: col.header,
      width: col.width,
      formatter: (value) => {
        const shown = displayValue(value as string | number | boolean | null | undefined);
        return shown === "-" ? shown : String(shown);
      },
    }));

    const docsByProgram = new Map<string, Array<{ name?: string; sourceType?: string; url?: string; createdAt?: string }>>();
    await Promise.all(
      exportRows.map(async (program) => {
        try {
          const response = await fetch(`/api/consolidado-programas/${program.id}/documents`);
          const body = (await response.json()) as {
            data?: Array<{ name?: string; sourceType?: string; url?: string; createdAt?: string }>;
          };

          if (response.ok && Array.isArray(body.data)) {
            docsByProgram.set(program.id, body.data);
          } else {
            docsByProgram.set(program.id, []);
          }
        } catch {
          docsByProgram.set(program.id, []);
        }
      }),
    );

    fullExportColumns.push(
      {
        key: "documentCount",
        header: "Cantidad\nDocumentos",
        width: 14,
        formatter: (value) => {
          const shown = displayValue(value as string | number | boolean | null | undefined);
          return shown === "-" ? shown : String(shown);
        },
      },
      {
        key: "documentsNames",
        header: "Documentos\n(Nombres)",
        width: 34,
        formatter: (value) => {
          const shown = displayValue(value as string | number | boolean | null | undefined);
          return shown === "-" ? shown : String(shown);
        },
      },
      {
        key: "documentsUrls",
        header: "Documentos\n(URL)",
        width: 44,
        formatter: (value) => {
          const shown = displayValue(value as string | number | boolean | null | undefined);
          return shown === "-" ? shown : String(shown);
        },
      },
    );

    const fullExportData = exportRows.map((program) => {
      const docs = docsByProgram.get(program.id) ?? [];
      const names = docs
        .map((doc) => doc.name?.trim())
        .filter((value): value is string => Boolean(value));
      const urls = docs
        .map((doc) => doc.url?.trim())
        .filter((value): value is string => Boolean(value));

      return {
        ...Object.fromEntries(FULL_EXPORT_COLUMNS.map((column) => [column.key, column.getValue(program)])),
        documentCount: docs.length,
        documentsNames: names.length > 0 ? names.join("\n") : "-",
        documentsUrls: urls.length > 0 ? urls.join("\n") : "-",
      };
    });

    const documentsSheetColumns: ExportColumn[] = [
      { key: "program", header: "Programa", width: 34 },
      { key: "faculty", header: "Facultad", width: 26 },
      { key: "processCode", header: "Codigo Proceso", width: 16 },
      { key: "name", header: "Nombre Documento", width: 28 },
      { key: "sourceType", header: "Tipo", width: 12 },
      { key: "createdAt", header: "Fecha Carga", width: 18, formatter: (value) => formatDate((value as string | null | undefined) ?? null) || "-" },
      { key: "url", header: "URL", width: 50 },
    ];

    const documentsSheetData = exportRows.flatMap((program) => {
      const docs = docsByProgram.get(program.id) ?? [];
      if (docs.length === 0) {
        return [
          {
            program: program.program,
            faculty: program.faculty,
            processCode: program.processCode,
            name: "-",
            sourceType: "-",
            createdAt: "-",
            url: "-",
          },
        ];
      }

      return docs.map((doc) => ({
        program: program.program,
        faculty: program.faculty,
        processCode: program.processCode,
        name: doc.name ?? "-",
        sourceType: doc.sourceType ?? "-",
        createdAt: doc.createdAt ?? "-",
        url: doc.url ?? "-",
      }));
    });

    await exportToExcel(filename, "Consolidado", VISIBLE_EXPORT_COLUMNS, visibleExportData, [
      {
        sheetTitle: "BD Completa",
        columns: fullExportColumns,
        data: fullExportData,
      },
      {
        sheetTitle: "Consolidado Documentos",
        columns: documentsSheetColumns,
        data: documentsSheetData,
      },
    ]);
  }, []); // No dependencies - uses ref instead

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

  useEffect(() => {
    if (!onExportReady) return;
    onExportReady(handleExport);
    return () => onExportReady(null);
  }, [onExportReady]); // handleExport doesn't change, so only onExportReady in deps

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
                className={`${program.isActive === false ? styles.inactiveRow : ""} ${selectedId === program.id ? styles.selectedRow : ""}`.trim() || undefined}
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
