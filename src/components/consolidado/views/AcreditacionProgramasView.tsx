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
  onProgramUpdate?: (program: ProgramRecord) => void;
};

type AcreditacionSegment = "acreditados" | "acreditables";

const ESTADO_OPTIONS = [
  "Acreditable",
  "En proceso de Acreditacion",
  "Acreditado 2026",
] as const;

const ESTADO_OPTIONS_ACREDITADOS: EstadoOption[] = ["Acreditado 2026", "Acreditable"];

type EstadoOption = (typeof ESTADO_OPTIONS)[number];

type AcreditacionSteps = {
  informeCgcEnviado: boolean;
  enviadoMinisterio: boolean;
  acreditacionRecibida: boolean;
};

type ProcessStepKey = keyof AcreditacionSteps;

type SortField =
  | "faculty"
  | "program"
  | "snies"
  | "location"
  | "level"
  | "estado"
  | "proceso"
  | "enviadoMinisterio"
  | "acreditacionRecibida";

type SortDirection = "asc" | "desc";

type AcreditacionEstadoApiRow = {
  program_id: string;
  estado: EstadoOption;
  informe_cgc_enviado: boolean | null;
  enviado_ministerio: boolean | null;
  acreditacion_recibida: boolean | null;
};

type HistoricalGoalRow = {
  id?: string;
  label: string;
  acreditados: string;
  acreditables: string;
  compliancePercent?: string;
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
    compliancePercent: "69",
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
    compliancePercent: row.compliance_percent !== null ? String(row.compliance_percent) : "",
  }));
}

function buildDerivedHistoricalRows(rows: HistoricalGoalRow[]): DerivedHistoricalGoalRow[] {
  const latestRowWithAcreditables = [...rows]
    .reverse()
    .find((row) => parseNullableNumber(row.acreditables) !== null);
  const latestAccreditable = latestRowWithAcreditables ? parseNullableNumber(latestRowWithAcreditables.acreditables) : null;
  const latestTarget60 = latestAccreditable !== null ? Math.round(latestAccreditable * 0.6) : null;

  return rows.map((row, index) => {
    const acreditados = parseNullableNumber(row.acreditados);
    const acreditables = parseNullableNumber(row.acreditables);

    const target25 = acreditables !== null ? Math.round(acreditables * 0.25) : null;
    const target40 = acreditables !== null ? Math.round(acreditables * 0.4) : null;
    const target60 = acreditables !== null ? Math.round(acreditables * 0.6) : null;

    const isMetaRow = index === rows.length - 1 || /cumplimiento|meta/i.test(row.label);
    let cumplimiento: number | null = null;
    if (isMetaRow) {
      const persistedCompliance = parseNullablePercent(row.compliancePercent ?? "");
      if (persistedCompliance !== null) {
        cumplimiento = Math.round(persistedCompliance);
      } else if (acreditados !== null && latestTarget60 !== null && latestTarget60 > 0) {
        cumplimiento = Math.round((acreditados / latestTarget60) * 100);
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

function extractYearFromLabel(label: string): string {
  const match = label.match(/(19|20)\d{2}/);
  return match?.[0] ?? "Meta";
}

function normalizeSteps(steps: AcreditacionSteps): AcreditacionSteps {
  const informeCgcEnviado = Boolean(steps.informeCgcEnviado);
  const enviadoMinisterio = Boolean(steps.enviadoMinisterio) && informeCgcEnviado;
  const acreditacionRecibida = Boolean(steps.acreditacionRecibida) && enviadoMinisterio;

  return {
    informeCgcEnviado,
    enviadoMinisterio,
    acreditacionRecibida,
  };
}

function inferStepsFromEstado(estado: EstadoOption | undefined, program: ProgramRecord): AcreditacionSteps {
  if (estado === "Acreditado 2026" || program.accredited) {
    return { informeCgcEnviado: true, enviadoMinisterio: true, acreditacionRecibida: true };
  }

  if (estado === "En proceso de Acreditacion") {
    return { informeCgcEnviado: true, enviadoMinisterio: false, acreditacionRecibida: false };
  }

  return { informeCgcEnviado: false, enviadoMinisterio: false, acreditacionRecibida: false };
}

function deriveEstadoFromSteps(steps: AcreditacionSteps): EstadoOption {
  if (steps.acreditacionRecibida) return "Acreditado 2026";
  if (steps.informeCgcEnviado || steps.enviadoMinisterio) return "En proceso de Acreditacion";
  return "Acreditable";
}

function getAcreditableRowClass(steps: AcreditacionSteps): string {
  if (steps.acreditacionRecibida) return styles.processRowAcreditacion;
  if (steps.enviadoMinisterio) return styles.processRowMinisterio;
  if (steps.informeCgcEnviado) return styles.processRowCgc;
  return styles.processRowPendiente;
}

function getProcessRank(steps: AcreditacionSteps): number {
  if (steps.acreditacionRecibida) return 3;
  if (steps.enviadoMinisterio) return 2;
  if (steps.informeCgcEnviado) return 1;
  return 0;
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "es", { sensitivity: "base" });
}

export function AcreditacionProgramasView({ rows, groupingMode, onExportReady, onProgramUpdate }: Props) {
  const useFacultyGrouping = groupingMode === "facultades";
  const [segment, setSegment] = useState<AcreditacionSegment>("acreditados");
  const [estadoByProgramId, setEstadoByProgramId] = useState<Record<string, EstadoOption>>({});
  const [stepsByProgramId, setStepsByProgramId] = useState<Record<string, AcreditacionSteps>>({});
  const [sortField, setSortField] = useState<SortField>("faculty");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [savingEstadoId, setSavingEstadoId] = useState<string | null>(null);
  const [savingProcessId, setSavingProcessId] = useState<string | null>(null);
  const [historicalRows, setHistoricalRows] = useState<HistoricalGoalRow[]>(HISTORICAL_GOALS);
  const lastGroupingRef = useRef<AcreditacionGroupingMode | null>(null);
  const liveAccreditedCount = useMemo(() => rows.filter((program) => program.accredited).length, [rows]);
  const liveAccreditableCount = useMemo(() => rows.filter((program) => program.acreditable).length, [rows]);
  const hydratedHistoricalRows = useMemo(
    () =>
      historicalRows.map((row) => {
        if (/corte\s+a\s+2026/i.test(row.label)) {
          return {
            ...row,
            acreditados: String(liveAccreditedCount),
            acreditables: String(liveAccreditableCount),
          };
        }
        return row;
      }),
    [historicalRows, liveAccreditedCount, liveAccreditableCount],
  );
  const derivedHistoricalRows = useMemo(
    () => buildDerivedHistoricalRows(hydratedHistoricalRows),
    [hydratedHistoricalRows],
  );

  const resolveProgramSteps = useCallback(
    (program: ProgramRecord) => {
      const selectedEstado = estadoByProgramId[program.id];
      const fallback = inferStepsFromEstado(selectedEstado ?? inferEstado(program), program);
      const explicit = stepsByProgramId[program.id];
      return normalizeSteps(explicit ?? fallback);
    },
    [estadoByProgramId, stepsByProgramId],
  );

  const resolveProgramSegment = useCallback(
    (program: ProgramRecord): AcreditacionSegment | null => {
      // La verdad para los conteos se toma del flag `accredited`.
      if (!program.acreditable && !program.accredited) {
        return null;
      }

      if (program.accredited) return "acreditados";
      if (program.acreditable) return "acreditables";
      return null;
    },
    [],
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

  const sortedSegmentRows = useMemo(() => {
    const source = [...segmentRows];

    source.sort((left, right) => {
      const leftEstado = estadoByProgramId[left.id] ?? inferEstado(left);
      const rightEstado = estadoByProgramId[right.id] ?? inferEstado(right);
      const leftSteps = resolveProgramSteps(left);
      const rightSteps = resolveProgramSteps(right);

      let result = 0;
      switch (sortField) {
        case "faculty":
          result = compareText(left.faculty, right.faculty);
          break;
        case "program":
          result = compareText(left.program, right.program);
          break;
        case "snies":
          result = compareText(left.snies ?? "", right.snies ?? "");
          break;
        case "location":
          result = compareText(left.location ?? "", right.location ?? "");
          break;
        case "level":
          result = compareText(left.academicLevel ?? left.level ?? "", right.academicLevel ?? right.level ?? "");
          break;
        case "estado":
          result = compareText(leftEstado, rightEstado);
          break;
        case "proceso":
          result = getProcessRank(leftSteps) - getProcessRank(rightSteps);
          break;
        case "enviadoMinisterio":
          result = Number(leftSteps.enviadoMinisterio) - Number(rightSteps.enviadoMinisterio);
          break;
        case "acreditacionRecibida":
          result = Number(leftSteps.acreditacionRecibida) - Number(rightSteps.acreditacionRecibida);
          break;
      }

      if (result === 0) {
        result = compareText(left.program, right.program);
      }

      return sortDirection === "asc" ? result : -result;
    });

    return source;
  }, [segmentRows, sortDirection, sortField, estadoByProgramId, resolveProgramSteps]);

  const facultyRows = useMemo(() => buildFacultyRows(segmentRows), [segmentRows]);

  function handleSortChange(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("asc");
  }

  function getSortIndicator(field: SortField) {
    if (sortField !== field) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  }

  function inferEstado(program: ProgramRecord): EstadoOption {
    if (program.accredited) return "Acreditado 2026";
    return "Acreditable";
  }

  async function loadEstados() {
    try {
      const response = await fetch("/api/acreditacion-estados");
      const body = (await response.json()) as {
        data?: AcreditacionEstadoApiRow[];
      };

      if (!response.ok || !body.data) {
        return;
      }

      const mapped = body.data.reduce<Record<string, EstadoOption>>((acc, item) => {
        if (ESTADO_OPTIONS.includes(item.estado)) {
          acc[item.program_id] = item.estado;
        } else if (item.estado === "Acreditado 2026") {
          acc[item.program_id] = "Acreditado 2026";
        }
        return acc;
      }, {});

      const mappedSteps = body.data.reduce<Record<string, AcreditacionSteps>>((acc, item) => {
        const row = rows.find((program) => program.id === item.program_id);
        if (!row) return acc;

        const fallback = inferStepsFromEstado(item.estado, row);
        acc[item.program_id] = normalizeSteps({
          informeCgcEnviado: item.informe_cgc_enviado ?? fallback.informeCgcEnviado,
          enviadoMinisterio: item.enviado_ministerio ?? fallback.enviadoMinisterio,
          acreditacionRecibida: item.acreditacion_recibida ?? fallback.acreditacionRecibida,
        });
        return acc;
      }, {});

      setEstadoByProgramId(mapped);
      setStepsByProgramId(mappedSteps);
    } catch {
      // Keep inferred defaults if explicit estados cannot be loaded.
    }
  }

  useEffect(() => {
    void loadEstados();
  }, [groupingMode, rows]);

  async function handleEstadoChange(program: ProgramRecord, estado: EstadoOption) {
    const previous = estadoByProgramId[program.id];
    const previousSegment = previous === "Acreditado 2026" ? "acreditados" : resolveProgramSegment(program) ?? "acreditables";
    setSavingEstadoId(program.id);
    setEstadoByProgramId((current) => ({ ...current, [program.id]: estado }));
    setSegment(estado === "Acreditado 2026" ? "acreditados" : "acreditables");

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

      const updatedProgram: ProgramRecord = {
        ...program,
        acreditable: true,
        accredited: estado === "Acreditado 2026",
      };

      const syncResponse = await fetch(`/api/consolidado-programas/${encodeURIComponent(program.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProgram),
      });

      const syncBody = (await syncResponse.json()) as { error?: string };
      if (!syncResponse.ok) {
        throw new Error(syncBody.error ?? "No se pudo sincronizar el estado de acreditacion del programa.");
      }

      onProgramUpdate?.(updatedProgram);

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
      setSegment(previousSegment);
      showToast.error(message, {
        position: "top-right",
        transition: "slideInUp",
        duration: 3000,
      });
    } finally {
      setSavingEstadoId(null);
    }
  }

  async function handleProcessStepChange(program: ProgramRecord, step: ProcessStepKey) {
    const current = resolveProgramSteps(program);
    const previousState = stepsByProgramId[program.id];
    const previousEstado = estadoByProgramId[program.id] ?? inferEstado(program);
    const previousSegment = resolveProgramSegment(program) ?? "acreditables";

    let next: AcreditacionSteps;
    if (step === "informeCgcEnviado") {
      next = normalizeSteps({ ...current, informeCgcEnviado: !current.informeCgcEnviado });
    } else if (step === "enviadoMinisterio") {
      if (!current.informeCgcEnviado) return;
      next = normalizeSteps({ ...current, enviadoMinisterio: !current.enviadoMinisterio });
    } else {
      if (!current.enviadoMinisterio) return;
      next = normalizeSteps({ ...current, acreditacionRecibida: !current.acreditacionRecibida });
    }

    const nextEstado = deriveEstadoFromSteps(next);

    setSavingProcessId(program.id);
    setStepsByProgramId((prev) => ({ ...prev, [program.id]: next }));
    setEstadoByProgramId((prev) => ({ ...prev, [program.id]: nextEstado }));
    setSegment(nextEstado === "Acreditado 2026" ? "acreditados" : "acreditables");

    try {
      const response = await fetch(`/api/acreditacion-estados/${encodeURIComponent(program.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: nextEstado,
          informeCgcEnviado: next.informeCgcEnviado,
          enviadoMinisterio: next.enviadoMinisterio,
          acreditacionRecibida: next.acreditacionRecibida,
        }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "No se pudo guardar el seguimiento de acreditacion.");
      }

      const updatedProgram: ProgramRecord = {
        ...program,
        acreditable: true,
        accredited: next.acreditacionRecibida,
      };

      const syncResponse = await fetch(`/api/consolidado-programas/${encodeURIComponent(program.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProgram),
      });

      const syncBody = (await syncResponse.json()) as { error?: string };
      if (!syncResponse.ok) {
        throw new Error(syncBody.error ?? "No se pudo sincronizar el estado de acreditacion del programa.");
      }

      onProgramUpdate?.(updatedProgram);

      showToast.success("Seguimiento actualizado.", {
        position: "top-right",
        transition: "bounceIn",
        duration: 2200,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el seguimiento de acreditacion.";
      setStepsByProgramId((prev) => {
        const copy = { ...prev };
        if (previousState) copy[program.id] = previousState;
        else delete copy[program.id];
        return copy;
      });
      setEstadoByProgramId((prev) => ({ ...prev, [program.id]: previousEstado }));
      setSegment(previousSegment);
      showToast.error(message, {
        position: "top-right",
        transition: "slideInUp",
        duration: 3000,
      });
    } finally {
      setSavingProcessId(null);
    }
  }

  async function seedHistoricalRows() {
      const seededDerivedRows = buildDerivedHistoricalRows(HISTORICAL_GOALS);

      await Promise.all(
        HISTORICAL_GOALS.map(async (row, index) => {
          const accreditedCount = parseNullableNumber(row.acreditados);
          const accreditableCount = parseNullableNumber(row.acreditables);
          const compliancePercent = parseNullablePercent(seededDerivedRows[index]?.cumplimiento ?? "");

          await fetch("/api/acreditacion-historicos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: row.label,
              accreditedCount,
              accreditableCount,
              target25: parseNullableNumber(seededDerivedRows[index]?.target25 ?? ""),
              target40: parseNullableNumber(seededDerivedRows[index]?.target40 ?? ""),
              target60: parseNullableNumber(seededDerivedRows[index]?.target60 ?? ""),
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
    const wasHistoricos = lastGroupingRef.current === "historicos";
    if (groupingMode === "historicos" && !wasHistoricos) {
      void loadHistoricalRows();
    }
    lastGroupingRef.current = groupingMode;
  });

  const historicalKpis = useMemo(() => {
    const targetPrograms = 49;
    const currentAccredited = rows.filter((program) => program.accredited).length;
    const compliance = targetPrograms > 0 ? Math.round((currentAccredited / targetPrograms) * 100) : 0;
    const gap = Math.max(targetPrograms - currentAccredited, 0);

    return {
      targetPrograms,
      currentAccredited,
      compliance,
      gap,
    };
  }, [acreditadosRows.length]);

  const summary = useMemo(() => {
    const sourceRows = segmentRows;
    const total = sourceRows.length;
    const active = sourceRows.filter((program) => isAacActive(program.aacEnd) === true).length;
    const expired = sourceRows.filter((program) => isAacActive(program.aacEnd) === false).length;
    const unknown = total - active - expired;
    return { total, active, expired, unknown };
  }, [segmentRows]);

  const processSummary = useMemo(() => {
    const total = segmentRows.length;
    let informeCgcEnviado = 0;
    let enviadoMinisterio = 0;
    let acreditacionRecibida = 0;

    for (const program of segmentRows) {
      const steps = resolveProgramSteps(program);
      if (steps.informeCgcEnviado) informeCgcEnviado += 1;
      if (steps.enviadoMinisterio) enviadoMinisterio += 1;
      if (steps.acreditacionRecibida) acreditacionRecibida += 1;
    }

    return { total, informeCgcEnviado, enviadoMinisterio, acreditacionRecibida };
  }, [resolveProgramSteps, segmentRows]);

  // Keep reference to current data for export
  const exportDataRef = useRef({ derivedHistoricalRows, estadoByProgramId, stepsByProgramId, facultyRows, groupingMode, segment, segmentRows, useFacultyGrouping });
  useEffect(() => {
    exportDataRef.current = { derivedHistoricalRows, estadoByProgramId, stepsByProgramId, facultyRows, groupingMode, segment, segmentRows, useFacultyGrouping };
  }, [derivedHistoricalRows, estadoByProgramId, stepsByProgramId, facultyRows, groupingMode, segment, segmentRows, useFacultyGrouping]);

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
        { key: "expired", header: "AAC Extendida", width: 14 },
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

    const columns: ExportColumn[] =
      exp.segment === "acreditables"
        ? [
            { key: "faculty", header: "Facultad", width: 34 },
            { key: "program", header: "Programa", width: 42 },
            { key: "snies", header: "SNIES", width: 14 },
            { key: "location", header: "Lugar de Desarrollo", width: 24 },
            { key: "level", header: "Nivel Academico", width: 22 },
            { key: "informeCgcEnviado", header: "Informe entregado al CGC", width: 20 },
            { key: "enviadoMinisterio", header: "Enviado al ministerio", width: 20 },
            { key: "acreditacionRecibida", header: "Acreditacion recibida", width: 20 },
          ]
        : [
            { key: "faculty", header: "Facultad", width: 34 },
            { key: "program", header: "Programa", width: 42 },
            { key: "snies", header: "SNIES", width: 14 },
            { key: "location", header: "Lugar de Desarrollo", width: 24 },
            { key: "level", header: "Nivel Academico", width: 22 },
            { key: "estado", header: "Estado", width: 24 },
            { key: "active", header: "AAC Vigente", width: 14 },
            { key: "expired", header: "AAC Extendida", width: 14 },
            { key: "unknown", header: "Sin Fecha AAC", width: 16 },
          ];

    const data = exp.segmentRows.map((program) => {
      const active = isAacActive(program.aacEnd);
      const estado = exp.estadoByProgramId[program.id] ?? inferEstado(program);
      const steps = normalizeSteps(
        exp.stepsByProgramId[program.id] ?? inferStepsFromEstado(estado, program),
      );
      return {
        faculty: program.faculty,
        program: program.program,
        snies: program.snies ?? "-",
        location: program.location ?? "-",
        level: program.academicLevel ?? program.level ?? "-",
        estado,
        informeCgcEnviado: steps.informeCgcEnviado ? "Si" : "No",
        enviadoMinisterio: steps.enviadoMinisterio ? "Si" : "No",
        acreditacionRecibida: steps.acreditacionRecibida ? "Si" : "No",
        active: active === true ? 1 : "",
        expired: active === false ? 1 : "",
        unknown: active === null ? 1 : "",
      };
    });

    await exportToExcel(`Acreditacion-Programas-${exp.segment}-${timestamp}`, "Acreditacion Programas", columns, data);
  }, []);

  useEffect(() => {
    if (!onExportReady) return;
    if (groupingMode === "historicos") {
      onExportReady(null);
      return;
    }

    onExportReady(handleExport);
    return () => onExportReady(null);
  }, [groupingMode, onExportReady]);

  return (
    <div className={styles.wrap}>
      {groupingMode === "historicos" && (
        <div className={styles.historyWrap}>
          <div className={styles.historyHeader}>
            <h3 className={styles.historyTitle}>Histórico de Cumplimiento de Acreditación</h3>
          </div>
          <p className={styles.historyHint}>
            Vista automática. Meta actual: programas acreditados / 60% de los acreditados con corte 2026 (base 49).
          </p>

          <section className={styles.historyKpisGrid}>
            <article className={`${styles.historyKpiCard} ${styles.historyKpiCardPrimary}`}>
              <p className={styles.historyKpiLabel}>Programas acreditados hoy</p>
              <p className={styles.historyKpiValue}>{historicalKpis.currentAccredited}</p>
            </article>
            <article className={`${styles.historyKpiCard} ${styles.historyKpiCardSuccess}`}>
              <p className={styles.historyKpiLabel}>Cumplimiento actual</p>
              <p className={styles.historyKpiValue}>{historicalKpis.compliance}%</p>
              <p className={styles.historyKpiMeta}>Meta fija: {historicalKpis.targetPrograms}</p>
            </article>
            <article className={`${styles.historyKpiCard} ${styles.historyKpiCardAccent}`}>
              <p className={styles.historyKpiLabel}>Brecha para meta 2026</p>
              <p className={styles.historyKpiValue}>{historicalKpis.gap}</p>
              <p className={styles.historyKpiMeta}>Programas faltantes para llegar a 49</p>
            </article>
          </section>

          <section className={styles.historyCardsGrid}>
            {derivedHistoricalRows
              .filter((row) => !/cumplimiento|meta/i.test(row.label))
              .map((row) => {
              const complianceValue = parseNullablePercent(row.cumplimiento) ?? 0;
              const progressWidth = Math.max(0, Math.min(complianceValue, 100));
              const yearLabel = extractYearFromLabel(row.label);

              return (
                <article key={row.id ?? row.label} className={styles.historyPeriodCard}>
                  <span className={styles.historyPeriodYear}>{yearLabel}</span>
                  <h4 className={styles.historyPeriodTitle}>{row.label}</h4>
                  <div className={styles.historyPeriodStats}>
                    <span>Acreditados: <strong>{row.acreditados || "-"}</strong></span>
                    <span>Acreditables: <strong>{row.acreditables || "-"}</strong></span>
                    <span>Meta 60%: <strong>{row.target60 || "-"}</strong></span>
                  </div>
                  <div className={styles.historyProgressTrack}>
                    <div className={styles.historyProgressBar} style={{ width: `${progressWidth}%` }} />
                  </div>
                  <p className={styles.historyComplianceText}>Cumplimiento: <strong>{row.cumplimiento || "-"}</strong></p>
                </article>
              );
            })}
          </section>
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

          {segment === "acreditables" && !useFacultyGrouping && (
            <div className={styles.processLegend}>
              <span className={styles.processLegendTitle}>Semaforo de avance:</span>
              <span className={`${styles.processLegendItem} ${styles.processLegendItemPendiente}`}>Sin iniciar</span>
              <span className={`${styles.processLegendItem} ${styles.processLegendItemCgc}`}>Informe entregado al CGC</span>
              <span className={`${styles.processLegendItem} ${styles.processLegendItemMinisterio}`}>Enviado al ministerio</span>
              <span className={`${styles.processLegendItem} ${styles.processLegendItemAcreditacion}`}>Acreditacion recibida</span>
            </div>
          )}

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>
                    {useFacultyGrouping ? (
                      "Facultad"
                    ) : (
                      <button type="button" className={styles.sortButton} onClick={() => handleSortChange("faculty")}>
                        <span>Facultad</span>
                        <span className={styles.sortIndicator}>{getSortIndicator("faculty")}</span>
                      </button>
                    )}
                  </th>
                  {useFacultyGrouping ? (
                    <th>Programas</th>
                  ) : (
                    <th>
                      <button type="button" className={styles.sortButton} onClick={() => handleSortChange("program")}>
                        <span>Programa Acreditado</span>
                        <span className={styles.sortIndicator}>{getSortIndicator("program")}</span>
                      </button>
                    </th>
                  )}
                  {!useFacultyGrouping && (
                    <th className={styles.sniesHead}>
                      <button type="button" className={styles.sortButton} onClick={() => handleSortChange("snies")}>
                        <span>SNIES</span>
                        <span className={styles.sortIndicator}>{getSortIndicator("snies")}</span>
                      </button>
                    </th>
                  )}
                  {!useFacultyGrouping && (
                    <th>
                      <button type="button" className={styles.sortButton} onClick={() => handleSortChange("location")}>
                        <span>Lugar de Desarrollo</span>
                        <span className={styles.sortIndicator}>{getSortIndicator("location")}</span>
                      </button>
                    </th>
                  )}
                  {!useFacultyGrouping && (
                    <th>
                      <button type="button" className={styles.sortButton} onClick={() => handleSortChange("level")}>
                        <span>Nivel Academico</span>
                        <span className={styles.sortIndicator}>{getSortIndicator("level")}</span>
                      </button>
                    </th>
                  )}
                  {!useFacultyGrouping && segment === "acreditables" && (
                    <th>
                      <button type="button" className={styles.sortButton} onClick={() => handleSortChange("proceso")}>
                        <span>Informe entregado al CGC</span>
                        <span className={styles.sortIndicator}>{getSortIndicator("proceso")}</span>
                      </button>
                    </th>
                  )}
                  {!useFacultyGrouping && segment === "acreditables" && (
                    <th>
                      <button type="button" className={styles.sortButton} onClick={() => handleSortChange("enviadoMinisterio")}>
                        <span>Enviado al ministerio</span>
                        <span className={styles.sortIndicator}>{getSortIndicator("enviadoMinisterio")}</span>
                      </button>
                    </th>
                  )}
                  {!useFacultyGrouping && segment === "acreditables" && (
                    <th>
                      <button type="button" className={styles.sortButton} onClick={() => handleSortChange("acreditacionRecibida")}>
                        <span>Acreditacion recibida</span>
                        <span className={styles.sortIndicator}>{getSortIndicator("acreditacionRecibida")}</span>
                      </button>
                    </th>
                  )}
                  {!useFacultyGrouping && segment !== "acreditables" && (
                    <th>
                      <button type="button" className={styles.sortButton} onClick={() => handleSortChange("estado")}>
                        <span>Estado</span>
                        <span className={styles.sortIndicator}>{getSortIndicator("estado")}</span>
                      </button>
                    </th>
                  )}
                  {(useFacultyGrouping || segment !== "acreditables") && <th>AAC Vigente</th>}
                  {(useFacultyGrouping || segment !== "acreditables") && <th>AAC Extendida</th>}
                  {(useFacultyGrouping || segment !== "acreditables") && <th>Sin Fecha AAC</th>}
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
                    : sortedSegmentRows.map((program) => {
                      const active = isAacActive(program.aacEnd);
                      const selectedEstado = estadoByProgramId[program.id] ?? inferEstado(program);
                      const steps = resolveProgramSteps(program);
                      const disableMinisterio = !steps.informeCgcEnviado || savingProcessId === program.id;
                      const disableAcreditacion = !steps.enviadoMinisterio || savingProcessId === program.id;
                      const processRowClass = segment === "acreditables" ? getAcreditableRowClass(steps) : "";
                      return (
                        <tr key={program.id} className={processRowClass}>
                          <td className={styles.facultyCell} title={program.faculty}>{program.faculty}</td>
                          <td className={styles.programCell} title={program.program}>{program.program}</td>
                          <td className={styles.sniesCell} title={program.snies ?? ""}>{program.snies ?? "-"}</td>
                          <td className={styles.textCell} title={program.location ?? ""}>{program.location ?? "-"}</td>
                          <td className={styles.levelCell} title={program.academicLevel ?? program.level ?? ""}>{program.academicLevel ?? program.level ?? "-"}</td>
                          {segment === "acreditables" ? (
                            <>
                              <td className={styles.processCell}>
                                <button
                                  type="button"
                                  className={`${styles.processButton} ${styles.processButtonCgc} ${steps.informeCgcEnviado ? styles.processButtonDoneCgc : ""}`}
                                  disabled={savingProcessId === program.id}
                                  onClick={() => void handleProcessStepChange(program, "informeCgcEnviado")}
                                >
                                  {steps.informeCgcEnviado ? "Completado" : "Pendiente"}
                                </button>
                              </td>
                              <td className={styles.processCell}>
                                <button
                                  type="button"
                                  className={`${styles.processButton} ${styles.processButtonMinisterio} ${steps.enviadoMinisterio ? styles.processButtonDoneMinisterio : ""}`}
                                  disabled={disableMinisterio}
                                  onClick={() => void handleProcessStepChange(program, "enviadoMinisterio")}
                                  title={!steps.informeCgcEnviado ? "Primero complete el envio al CGC." : ""}
                                >
                                  {steps.enviadoMinisterio ? "Completado" : "Pendiente"}
                                </button>
                              </td>
                              <td className={styles.processCell}>
                                <button
                                  type="button"
                                  className={`${styles.processButton} ${styles.processButtonAcreditacion} ${steps.acreditacionRecibida ? styles.processButtonDoneAcreditacion : ""}`}
                                  disabled={disableAcreditacion}
                                  onClick={() => void handleProcessStepChange(program, "acreditacionRecibida")}
                                  title={!steps.enviadoMinisterio ? "Primero complete el envio al ministerio." : ""}
                                >
                                  {steps.acreditacionRecibida ? "Recibida" : "Pendiente"}
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className={styles.estadoCell}>
                                <select
                                  className={styles.estadoSelect}
                                  value={selectedEstado}
                                  disabled={savingEstadoId === program.id}
                                  onChange={(event) => handleEstadoChange(program, event.target.value as EstadoOption)}
                                >
                                  {(segment === "acreditados" ? ESTADO_OPTIONS_ACREDITADOS : ESTADO_OPTIONS).map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className={styles.numericCell}>{active === true ? "1" : ""}</td>
                              <td className={styles.numericCell}>{active === false ? "1" : ""}</td>
                              <td className={styles.numericCell}>{active === null ? "1" : ""}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
              </tbody>

              <tfoot>
                <tr>
                  <td className={styles.footerLabel} colSpan={useFacultyGrouping ? 2 : segment === "acreditables" ? 5 : 6}>Consolidado</td>
                  {segment === "acreditables" && !useFacultyGrouping ? (
                    <>
                      <td className={styles.footerCell}>{processSummary.informeCgcEnviado} ({formatPercent(processSummary.informeCgcEnviado, processSummary.total)})</td>
                      <td className={styles.footerCell}>{processSummary.enviadoMinisterio} ({formatPercent(processSummary.enviadoMinisterio, processSummary.total)})</td>
                      <td className={styles.footerCell}>{processSummary.acreditacionRecibida} ({formatPercent(processSummary.acreditacionRecibida, processSummary.total)})</td>
                    </>
                  ) : (
                    <>
                      <td className={styles.footerCell}>{summary.active} ({formatPercent(summary.active, summary.total)})</td>
                      <td className={styles.footerCell}>{summary.expired} ({formatPercent(summary.expired, summary.total)})</td>
                      <td className={styles.footerCell}>{summary.unknown} ({formatPercent(summary.unknown, summary.total)})</td>
                    </>
                  )}
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