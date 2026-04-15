"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { showToast } from "nextjs-toast-notify";

import { exportToExcel, type ExportColumn } from "@/lib/export";
import type { AcreditacionGroupingMode, ProgramRecord } from "../types";
import styles from "./styles/AcreditacionProgramasView.module.css";

type Props = {
  rows: ProgramRecord[];
  groupingMode: AcreditacionGroupingMode;
  onExportReady?: (action: (() => Promise<void>) | null) => void;
};

type AcreditacionSegment = "acreditados" | "acreditables";

const ESTADO_OPTIONS = [
  "Renovaciones",
  "En proceso renovación",
  "Nuevos",
  "En proceso de AAC",
  "Acreditado a 2026",
] as const;

type EstadoOption = (typeof ESTADO_OPTIONS)[number];

type HistoricalGoalRow = {
  id?: string;
  label: string;
  acreditados: string;
  acreditables: string;
};

type DerivedHistoricalGoalRow = HistoricalGoalRow & {
  target25: string;
  target40: string;
  target60: string;
  cumplimiento: string;
};

type HistoricalApiRow = {
  id: string;
  label: string;
  accredited_count: number | null;
  accreditable_count: number | null;
  target_25: number | null;
  target_40: number | null;
  target_60: number | null;
  compliance_percent: number | null;
  order_index: number;
};

const HISTORICAL_GOALS: HistoricalGoalRow[] = [
  {
    label: "Acreditados con corte a 2019",
    acreditados: "20",
    acreditables: "42",
  },
  {
    label: "Acreditados con corte a 2022",
    acreditados: "27",
    acreditables: "68",
  },
  {
    label: "Acreditados con corte a 2023",
    acreditados: "36",
    acreditables: "68",
  },
  {
    label: "Acreditados con corte a 2024",
    acreditados: "35",
    acreditables: "68",
  },
  {
    label: "Acreditados con corte a 2026",
    acreditados: "35",
    acreditables: "82",
  },
  {
    label: "% cumplimiento de la meta a 31/12/2024",
    acreditados: "34",
    acreditables: "",
  },
];

function isAacActive(aacEnd: string | null) {
  if (!aacEnd) return null;
  const date = new Date(aacEnd);
  if (Number.isNaN(date.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return date.getTime() >= now.getTime();
}

function formatPercent(value: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function buildProgramRows(rows: ProgramRecord[]) {
  return [...rows].sort((left, right) =>
    left.faculty === right.faculty
      ? left.program.localeCompare(right.program, "es", { sensitivity: "base" })
      : left.faculty.localeCompare(right.faculty, "es", { sensitivity: "base" }),
  );
}

function buildFacultyRows(rows: ProgramRecord[]) {
  const map = new Map<
    string,
    {
      faculty: string;
      total: number;
      active: number;
      expired: number;
      unknown: number;
    }
  >();

  for (const program of rows) {
    const current = map.get(program.faculty) ?? {
      faculty: program.faculty,
      total: 0,
      active: 0,
      expired: 0,
      unknown: 0,
    };

    current.total += 1;
    const active = isAacActive(program.aacEnd);
    if (active === true) current.active += 1;
    else if (active === false) current.expired += 1;
    else current.unknown += 1;

    map.set(program.faculty, current);
  }

  return [...map.values()].sort((a, b) => a.faculty.localeCompare(b.faculty, "es", { sensitivity: "base" }));
}

function parseNullableNumber(value: string): number | null {
  const clean = value.trim().replace(/,/g, ".");
  if (!clean) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNullablePercent(value: string): number | null {
  const clean = value.replace("%", "").trim().replace(/,/g, ".");
  if (!clean) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapApiRowsToView(rows: HistoricalApiRow[]): HistoricalGoalRow[] {
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    acreditados: row.accredited_count !== null ? String(row.accredited_count) : "",
    acreditables: row.accreditable_count !== null ? String(row.accreditable_count) : "",
  }));
}

function buildDerivedHistoricalRows(rows: HistoricalGoalRow[]): DerivedHistoricalGoalRow[] {
  const row2026 = rows.find((row) => row.label.toLowerCase().includes("2026"));
  const accreditable2026 = row2026 ? parseNullableNumber(row2026.acreditables) : null;
  const target602026 = accreditable2026 !== null ? Math.round(accreditable2026 * 0.6) : null;

  return rows.map((row) => {
    const acreditados = parseNullableNumber(row.acreditados);
    const acreditables = parseNullableNumber(row.acreditables);

    const target25 = acreditables !== null ? Math.round(acreditables * 0.25) : null;
    const target40 = acreditables !== null ? Math.round(acreditables * 0.4) : null;
    const target60 = acreditables !== null ? Math.round(acreditables * 0.6) : null;

    let cumplimiento: number | null = null;
    if (row.label.toLowerCase().includes("31/12/2024")) {
      if (acreditados !== null && target602026 && target602026 > 0) {
        cumplimiento = Math.round((acreditados / target602026) * 100);
      }
    } else if (acreditados !== null && acreditables && acreditables > 0) {
      cumplimiento = Math.round((acreditados / acreditables) * 100);
    }

    return {
      ...row,
      target25: target25 !== null ? String(target25) : "",
      target40: target40 !== null ? String(target40) : "",
      target60: target60 !== null ? String(target60) : "",
      cumplimiento: cumplimiento !== null ? `${cumplimiento}%` : "",
    };
  });
}

export function AcreditacionProgramasView({ rows, groupingMode, onExportReady }: Props) {
  const useFacultyGrouping = groupingMode === "facultades";
  const [segment, setSegment] = useState<AcreditacionSegment>("acreditados");
  const [estadoByProgramId, setEstadoByProgramId] = useState<Record<string, EstadoOption>>({});
  const [savingEstadoId, setSavingEstadoId] = useState<string | null>(null);
  const [historicalRows, setHistoricalRows] = useState<HistoricalGoalRow[]>(HISTORICAL_GOALS);
  const [savingHistoricalIndex, setSavingHistoricalIndex] = useState<number | null>(null);
  const [historicalMessage, setHistoricalMessage] = useState<string>("");
  const derivedHistoricalRows = useMemo(() => buildDerivedHistoricalRows(historicalRows), [historicalRows]);
  const resolveProgramSegment = useCallback(
    (program: ProgramRecord): AcreditacionSegment | null => {
      const selectedEstado = estadoByProgramId[program.id];

      // Explicit estado selection has priority over boolean flags from payload.
      if (selectedEstado) {
        return selectedEstado === "Acreditado a 2026" ? "acreditados" : "acreditables";
      }

      if (program.accredited) return "acreditados";
      if (program.acreditable) return "acreditables";
      return null;
    },
    [estadoByProgramId],
  );

  const acreditadosRows = useMemo(
    () => buildProgramRows(rows.filter((program) => resolveProgramSegment(program) === "acreditados")),
    [resolveProgramSegment, rows],
  );
  const acreditablesRows = useMemo(
    () => buildProgramRows(rows.filter((program) => resolveProgramSegment(program) === "acreditables")),
    [resolveProgramSegment, rows],
  );
  const segmentRows = segment === "acreditados" ? acreditadosRows : acreditablesRows;
  const facultyRows = useMemo(() => buildFacultyRows(segmentRows), [segmentRows]);

  function inferEstado(program: ProgramRecord): EstadoOption {
    if (program.accredited) return "Acreditado a 2026";
    if (program.inAccreditationProcess) return "En proceso de AAC";
    return "Nuevos";
  }

  async function loadEstados() {
    try {
      const response = await fetch("/api/acreditacion-estados");
      const body = (await response.json()) as {
        data?: Array<{ program_id: string; estado: EstadoOption }>;
      };

      if (!response.ok || !body.data) {
        return;
      }

      const mapped = body.data.reduce<Record<string, EstadoOption>>((acc, item) => {
        if (ESTADO_OPTIONS.includes(item.estado)) {
          acc[item.program_id] = item.estado;
        }
        return acc;
      }, {});

      setEstadoByProgramId(mapped);
    } catch {
      // Keep inferred defaults if explicit estados cannot be loaded.
    }
  }

  useEffect(() => {
    if (groupingMode === "historicos") return;
    void loadEstados();
  }, [groupingMode]);

  async function handleEstadoChange(program: ProgramRecord, estado: EstadoOption) {
    const previous = estadoByProgramId[program.id];
    setSavingEstadoId(program.id);
    setEstadoByProgramId((current) => ({ ...current, [program.id]: estado }));
    setSegment(estado === "Acreditado a 2026" ? "acreditados" : "acreditables");

    try {
      const response = await fetch(`/api/acreditacion-estados/${encodeURIComponent(program.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "No se pudo guardar el estado del programa.");
      }

      showToast.success("Estado actualizado.", {
        position: "top-right",
        transition: "bounceIn",
        duration: 2200,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el estado del programa.";
      setEstadoByProgramId((current) => {
        const copy = { ...current };
        if (previous) copy[program.id] = previous;
        else delete copy[program.id];
        return copy;
      });
      showToast.error(message, {
        position: "top-right",
        transition: "slideInUp",
        duration: 3000,
      });
    } finally {
      setSavingEstadoId(null);
    }
  }

  async function seedHistoricalRows() {
    await Promise.all(
      HISTORICAL_GOALS.map(async (row, index) => {
        const accreditableCount = parseNullableNumber(row.acreditables);
        const target25 = accreditableCount !== null ? Math.round(accreditableCount * 0.25) : null;
        const target40 = accreditableCount !== null ? Math.round(accreditableCount * 0.4) : null;
        const target60 = accreditableCount !== null ? Math.round(accreditableCount * 0.6) : null;

        const accreditedCount = parseNullableNumber(row.acreditados);
        const compliancePercent =
          row.label.toLowerCase().includes("31/12/2024")
            ? null
            : accreditedCount !== null && accreditableCount && accreditableCount > 0
              ? Math.round((accreditedCount / accreditableCount) * 100)
              : null;

        await fetch("/api/acreditacion-historicos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: row.label,
            accreditedCount,
            accreditableCount,
            target25,
            target40,
            target60,
            compliancePercent,
            orderIndex: index,
          }),
        });
      }),
    );
  }

  async function loadHistoricalRows(options?: { autoSeed?: boolean }) {
    try {
      const response = await fetch("/api/acreditacion-historicos");
      const body = (await response.json()) as { data?: HistoricalApiRow[] };

      if (!response.ok || !body.data) {
        showToast.error("No se pudieron cargar los historicos de acreditacion.", {
          position: "top-right",
          transition: "slideInUp",
          duration: 3000,
        });
        return;
      }

      if (body.data.length === 0 && options?.autoSeed !== false) {
        await seedHistoricalRows();
        await loadHistoricalRows({ autoSeed: false });
        return;
      }

      if (body.data.length > 0) {
        setHistoricalRows(mapApiRowsToView(body.data));
      }
    } catch {
      showToast.error("No se pudieron cargar los historicos de acreditacion.", {
        position: "top-right",
        transition: "slideInUp",
        duration: 3000,
      });
      // Keep local defaults if historical rows cannot be fetched.
    }
  }

  useEffect(() => {
    void loadHistoricalRows();
  }, []);

  function handleHistoricalChange(index: number, key: keyof HistoricalGoalRow, value: string) {
    setHistoricalRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  }

  async function handleSaveHistoricalRow(row: HistoricalGoalRow, index: number) {
    setSavingHistoricalIndex(index);
    setHistoricalMessage("");

    try {
      const payload = {
        label: row.label.trim(),
        accreditedCount: parseNullableNumber(row.acreditados),
        accreditableCount: parseNullableNumber(row.acreditables),
        target25: parseNullableNumber(derivedHistoricalRows[index]?.target25 ?? ""),
        target40: parseNullableNumber(derivedHistoricalRows[index]?.target40 ?? ""),
        target60: parseNullableNumber(derivedHistoricalRows[index]?.target60 ?? ""),
        compliancePercent: parseNullablePercent(derivedHistoricalRows[index]?.cumplimiento ?? ""),
        orderIndex: index,
      };

      const response = await fetch(
        row.id ? `/api/acreditacion-historicos/${row.id}` : "/api/acreditacion-historicos",
        {
          method: row.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "No se pudo guardar el histórico.");
      }

      await loadHistoricalRows({ autoSeed: false });
      setHistoricalMessage("Histórico guardado correctamente.");
      showToast.success("Historico guardado correctamente.", {
        position: "top-right",
        transition: "bounceIn",
        duration: 2800,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el histórico.";
      setHistoricalMessage(message);
      showToast.error(message, {
        position: "top-right",
        transition: "slideInUp",
        duration: 3000,
      });
    } finally {
      setSavingHistoricalIndex(null);
    }
  }

  const summary = useMemo(() => {
    const sourceRows = segmentRows;
    const total = sourceRows.length;
    const active = sourceRows.filter((program) => isAacActive(program.aacEnd) === true).length;
    const expired = sourceRows.filter((program) => isAacActive(program.aacEnd) === false).length;
    const unknown = total - active - expired;
    return { total, active, expired, unknown };
  }, [segmentRows]);

  // Keep reference to current data for export
  const exportDataRef = useRef({ derivedHistoricalRows, estadoByProgramId, facultyRows, groupingMode, segment, segmentRows, useFacultyGrouping });
  useEffect(() => {
    exportDataRef.current = { derivedHistoricalRows, estadoByProgramId, facultyRows, groupingMode, segment, segmentRows, useFacultyGrouping };
  }, [derivedHistoricalRows, estadoByProgramId, facultyRows, groupingMode, segment, segmentRows, useFacultyGrouping]);

  const handleExport = useCallback(async () => {
    const timestamp = new Date().toLocaleDateString("es-CO");
    const exp = exportDataRef.current;

    if (exp.groupingMode === "historicos") {
      const columns: ExportColumn[] = [
        { key: "label", header: "Periodo", width: 36 },
        { key: "acreditados", header: "Acreditados", width: 14 },
        { key: "acreditables", header: "Acreditables", width: 14 },
        { key: "target25", header: "25%", width: 10 },
        { key: "target40", header: "40%", width: 10 },
        { key: "target60", header: "60%", width: 10 },
        { key: "cumplimiento", header: "Cumplimiento", width: 14 },
      ];

      const data = exp.derivedHistoricalRows.map((row) => ({
        label: row.label,
        acreditados: row.acreditados || "-",
        acreditables: row.acreditables || "-",
        target25: row.target25 || "-",
        target40: row.target40 || "-",
        target60: row.target60 || "-",
        cumplimiento: row.cumplimiento || "-",
      }));

      await exportToExcel(`Acreditacion-Historicos-${timestamp}`, "Acreditacion Historicos", columns, data);
      return;
    }

    if (exp.useFacultyGrouping) {
      const columns: ExportColumn[] = [
        { key: "faculty", header: "Facultad", width: 34 },
        { key: "total", header: "Programas", width: 14 },
        { key: "active", header: "AAC Vigente", width: 14 },
        { key: "expired", header: "AAC Vencida", width: 14 },
        { key: "unknown", header: "Sin Fecha AAC", width: 16 },
      ];

      await exportToExcel(
        `Acreditacion-Facultades-${exp.segment}-${timestamp}`,
        "Acreditacion Facultades",
        columns,
        exp.facultyRows,
      );
      return;
    }

    const columns: ExportColumn[] = [
      { key: "faculty", header: "Facultad", width: 34 },
      { key: "program", header: "Programa", width: 42 },
      { key: "snies", header: "SNIES", width: 14 },
      { key: "location", header: "Lugar de Desarrollo", width: 24 },
      { key: "level", header: "Nivel Academico", width: 22 },
      { key: "estado", header: "Estado", width: 24 },
      { key: "active", header: "AAC Vigente", width: 14 },
      { key: "expired", header: "AAC Vencida", width: 14 },
      { key: "unknown", header: "Sin Fecha AAC", width: 16 },
    ];

    const data = exp.segmentRows.map((program) => {
      const active = isAacActive(program.aacEnd);
      const estado = exp.estadoByProgramId[program.id] ?? inferEstado(program);
      return {
        faculty: program.faculty,
        program: program.program,
        snies: program.snies ?? "-",
        location: program.location ?? "-",
        level: program.academicLevel ?? program.level ?? "-",
        estado,
        active: active === true ? 1 : "",
        expired: active === false ? 1 : "",
        unknown: active === null ? 1 : "",
      };
    });

    await exportToExcel(`Acreditacion-Programas-${exp.segment}-${timestamp}`, "Acreditacion Programas", columns, data);
  }, []);

  useEffect(() => {
    if (!onExportReady) return;
    onExportReady(handleExport);
    return () => onExportReady(null);
  }, [onExportReady]);

  return (
    <div className={styles.wrap}>
      {groupingMode === "historicos" && (
        <div className={styles.historyWrap}>
          <div className={styles.historyHeader}>
            <h3 className={styles.historyTitle}>Histórico de Cumplimiento de Acreditación</h3>
          </div>
          <p className={styles.historyHint}>Puedes editar cualquier valor y usar Guardar para actualizarlo manualmente en la base de datos.</p>
          {historicalMessage && <p className={styles.historyMessage}>{historicalMessage}</p>}
          <div className={styles.historyTableWrap}>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>Acreditados</th>
                  <th>Acreditables</th>
                  <th>25%</th>
                  <th>40%</th>
                  <th>60%</th>
                  <th>Cumplimiento</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {derivedHistoricalRows.map((row, rowIndex) => (
                  <tr key={row.id ?? row.label}>
                    <td className={styles.historyLabelCell}>
                      <input
                        value={row.label}
                        onChange={(event) => handleHistoricalChange(rowIndex, "label", event.target.value)}
                        className={styles.historyInput}
                      />
                    </td>
                    <td>
                      <input
                        value={row.acreditados}
                        onChange={(event) => handleHistoricalChange(rowIndex, "acreditados", event.target.value)}
                        className={styles.historyInputSmall}
                      />
                    </td>
                    <td>
                      <input
                        value={row.acreditables}
                        onChange={(event) => handleHistoricalChange(rowIndex, "acreditables", event.target.value)}
                        className={styles.historyInputSmall}
                      />
                    </td>
                    <td>
                      <span className={styles.historyAutoValue}>{row.target25}</span>
                    </td>
                    <td>
                      <span className={styles.historyAutoValue}>{row.target40}</span>
                    </td>
                    <td>
                      <span className={styles.historyAutoValue}>{row.target60}</span>
                    </td>
                    <td className={styles.historyHighlightCell}>
                      <span className={styles.historyAutoValue}>{row.cumplimiento}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.saveRowBtn}
                        disabled={savingHistoricalIndex === rowIndex}
                        onClick={() => handleSaveHistoricalRow(row, rowIndex)}
                      >
                        {savingHistoricalIndex === rowIndex ? "Guardando..." : "Guardar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {groupingMode !== "historicos" && (
        <>
          <div className={styles.segmentWrap}>
            <span className={styles.segmentLabel}>Segmento</span>
            <div className={styles.segmentButtons}>
              <button
                type="button"
                className={`${styles.segmentButton} ${segment === "acreditados" ? styles.segmentButtonActive : ""}`}
                onClick={() => setSegment("acreditados")}
              >
                Acreditados ({acreditadosRows.length})
              </button>
              <button
                type="button"
                className={`${styles.segmentButton} ${segment === "acreditables" ? styles.segmentButtonActive : ""}`}
                onClick={() => setSegment("acreditables")}
              >
                Acreditables ({acreditablesRows.length})
              </button>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Facultad</th>
                  {useFacultyGrouping ? <th>Programas</th> : <th>Programa Acreditado</th>}
                  {!useFacultyGrouping && <th>SNIES</th>}
                  {!useFacultyGrouping && <th>Lugar de Desarrollo</th>}
                  {!useFacultyGrouping && <th>Nivel Academico</th>}
                  {!useFacultyGrouping && <th>Estado</th>}
                  <th>AAC Vigente</th>
                  <th>AAC Vencida</th>
                  <th>Sin Fecha AAC</th>
                </tr>
              </thead>

              <tbody>
                {useFacultyGrouping
                  ? facultyRows.map((row) => (
                      <tr key={row.faculty}>
                        <td className={styles.facultyCell} title={row.faculty}>{row.faculty}</td>
                        <td className={styles.programCell}>{row.total}</td>
                        <td className={styles.numericCell}>{row.active || ""}</td>
                        <td className={styles.numericCell}>{row.expired || ""}</td>
                        <td className={styles.numericCell}>{row.unknown || ""}</td>
                      </tr>
                    ))
                  : segmentRows.map((program) => {
                      const active = isAacActive(program.aacEnd);
                      const selectedEstado = estadoByProgramId[program.id] ?? inferEstado(program);
                      return (
                        <tr key={program.id}>
                          <td className={styles.facultyCell} title={program.faculty}>{program.faculty}</td>
                          <td className={styles.programCell} title={program.program}>{program.program}</td>
                          <td className={styles.textCell} title={program.snies ?? ""}>{program.snies ?? "-"}</td>
                          <td className={styles.textCell} title={program.location ?? ""}>{program.location ?? "-"}</td>
                          <td className={styles.levelCell} title={program.academicLevel ?? program.level ?? ""}>{program.academicLevel ?? program.level ?? "-"}</td>
                          <td className={styles.estadoCell}>
                            <select
                              className={styles.estadoSelect}
                              value={selectedEstado}
                              disabled={savingEstadoId === program.id}
                              onChange={(event) => handleEstadoChange(program, event.target.value as EstadoOption)}
                            >
                              {ESTADO_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className={styles.numericCell}>{active === true ? "1" : ""}</td>
                          <td className={styles.numericCell}>{active === false ? "1" : ""}</td>
                          <td className={styles.numericCell}>{active === null ? "1" : ""}</td>
                        </tr>
                      );
                    })}
              </tbody>

              <tfoot>
                <tr>
                  <td className={styles.footerLabel} colSpan={useFacultyGrouping ? 2 : 6}>Consolidado</td>
                  <td className={styles.footerCell}>{summary.active} ({formatPercent(summary.active, summary.total)})</td>
                  <td className={styles.footerCell}>{summary.expired} ({formatPercent(summary.expired, summary.total)})</td>
                  <td className={styles.footerCell}>{summary.unknown} ({formatPercent(summary.unknown, summary.total)})</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {segmentRows.length === 0 && (
            <p className={styles.empty}>No hay programas para mostrar con los filtros actuales.</p>
          )}
        </>
      )}
    </div>
  );
}