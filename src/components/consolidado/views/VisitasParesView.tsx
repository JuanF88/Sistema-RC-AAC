"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { showToast } from "nextjs-toast-notify";

import { exportToExcel, type ExportColumn } from "@/lib/export";
import type { ProgramRecord } from "../types";
import styles from "./styles/VisitasParesView.module.css";

type Props = {
  programs: ProgramRecord[];
  onExportReady?: (action: (() => Promise<void>) | null) => void;
};

type VisitaPar = {
  id: string;
  program: string;
  startDate: string;
  endDate: string;
  subject: string;
  modality: string;
};

type NewVisitaForm = {
  program: string;
  startDate: string;
  endDate: string;
  subject: string;
  modality: string;
};

const MODALITY_OPTIONS = ["Presencial", "Virtual", "Hibrida"] as const;

function parseLocalDate(value: string): Date | null {
  if (!value) return null;
  const parts = value.split("-").map((item) => Number(item));
  if (parts.length !== 3 || parts.some((item) => !Number.isFinite(item))) return null;
  const [year, month, day] = parts;
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDate(value: string) {
  if (!value) return "-";
  const dt = parseLocalDate(value);
  if (!dt || Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("es-CO");
}

export function VisitasParesView({ programs, onExportReady }: Props) {
  const [rows, setRows] = useState<VisitaPar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<NewVisitaForm>({
    program: "",
    startDate: "",
    endDate: "",
    subject: "",
    modality: MODALITY_OPTIONS[0],
  });

  const programOptions = useMemo(
    () => [...new Set(programs.map((program) => program.program).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
    [programs],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const response = await fetch("/api/visitas-pares");
        const body = (await response.json()) as {
          data?: Array<{
            id: string;
            program: string;
            start_date: string;
            end_date: string;
            subject: string;
            modality: string;
          }>;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(body.error ?? "No se pudieron cargar las visitas de pares.");
        }

        if (!cancelled) {
          setRows(
            (body.data ?? []).map((item) => ({
              id: item.id,
              program: item.program,
              startDate: item.start_date,
              endDate: item.end_date,
              subject: item.subject,
              modality: item.modality,
            })),
          );
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "No se pudieron cargar las visitas de pares.";
        if (!cancelled) {
          setMessage(msg);
          showToast.error(msg, { position: "top-right", transition: "slideInUp", duration: 3000 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateVisit() {
    setMessage("");

    if (!form.program.trim() || !form.startDate || !form.endDate || !form.subject.trim() || !form.modality) {
      const msg = "Completa todos los campos para registrar la visita.";
      setMessage(msg);
      showToast.warning(msg, { position: "top-right", transition: "slideInUp", duration: 2800 });
      return;
    }

    const startDate = parseLocalDate(form.startDate);
    const endDate = parseLocalDate(form.endDate);
    if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
      const msg = "La fecha final no puede ser anterior a la fecha de inicio.";
      setMessage(msg);
      showToast.warning(msg, { position: "top-right", transition: "slideInUp", duration: 2800 });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/visitas-pares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program: form.program,
          startDate: form.startDate,
          endDate: form.endDate,
          subject: form.subject,
          modality: form.modality,
        }),
      });

      const body = (await response.json()) as {
        data?: {
          id: string;
          program: string;
          start_date: string;
          end_date: string;
          subject: string;
          modality: string;
        };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error ?? "No se pudo registrar la visita de pares.");
      }

      if (body.data) {
        setRows((current) => [
          {
            id: body.data!.id,
            program: body.data!.program,
            startDate: body.data!.start_date,
            endDate: body.data!.end_date,
            subject: body.data!.subject,
            modality: body.data!.modality,
          },
          ...current,
        ]);
      }

      setForm({
        program: "",
        startDate: "",
        endDate: "",
        subject: "",
        modality: MODALITY_OPTIONS[0],
      });
      const msg = "Visita de pares registrada correctamente.";
      setMessage(msg);
      showToast.success(msg, { position: "top-right", transition: "bounceIn", duration: 2800 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo registrar la visita de pares.";
      setMessage(msg);
      showToast.error(msg, { position: "top-right", transition: "slideInUp", duration: 3000 });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteVisit(row: VisitaPar) {
    const confirmed = window.confirm(`Deseas eliminar la visita de pares del programa "${row.program}"?`);
    if (!confirmed) return;

    setMessage("");

    try {
      setDeletingId(row.id);
      const response = await fetch(`/api/visitas-pares/${row.id}`, {
        method: "DELETE",
      });

      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "No se pudo eliminar la visita de pares.");
      }

      setRows((current) => current.filter((item) => item.id !== row.id));
      const msg = "Visita de pares eliminada correctamente.";
      setMessage(msg);
      showToast.warning(msg, { position: "top-right", transition: "slideInUp", duration: 2600 });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo eliminar la visita de pares.";
      setMessage(msg);
      showToast.error(msg, { position: "top-right", transition: "slideInUp", duration: 3000 });
    } finally {
      setDeletingId(null);
    }
  }

  // Keep reference to current rows for export
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const handleExport = useCallback(async () => {
    const timestamp = new Date().toLocaleDateString("es-CO");
    const columns: ExportColumn[] = [
      { key: "program", header: "Programa", width: 38 },
      { key: "startDate", header: "Fecha inicio", width: 16, formatter: (v) => formatDate(String(v ?? "")) },
      { key: "endDate", header: "Fecha final", width: 16, formatter: (v) => formatDate(String(v ?? "")) },
      { key: "subject", header: "Asunto", width: 34 },
      { key: "modality", header: "Modalidad", width: 16 },
    ];

    await exportToExcel(`Visitas-Pares-${timestamp}`, "Visitas Pares", columns, rowsRef.current);
  }, []);

  useEffect(() => {
    if (!onExportReady) return;
    onExportReady(handleExport);
    return () => onExportReady(null);
  }, [onExportReady]);

  return (
    <div className={styles.wrap}>
      <div className={styles.formCard}>
        <h3 className={styles.formTitle}>Nueva Visita de Pares</h3>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span className={styles.label}>Programa</span>
            <select
              value={form.program}
              onChange={(event) => setForm((current) => ({ ...current, program: event.target.value }))}
            >
              <option value="">Selecciona un programa</option>
              {programOptions.map((program) => (
                <option key={program} value={program}>
                  {program}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Fecha inicio</span>
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Fecha final</span>
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Modalidad</span>
            <select
              value={form.modality}
              onChange={(event) => setForm((current) => ({ ...current, modality: event.target.value }))}
            >
              {MODALITY_OPTIONS.map((modality) => (
                <option key={modality} value={modality}>
                  {modality}
                </option>
              ))}
            </select>
          </label>

          <label className={`${styles.field} ${styles.fieldFull}`}>
            <span className={styles.label}>Asunto</span>
            <input
              type="text"
              value={form.subject}
              onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
              placeholder="Escribe el asunto de la visita"
            />
          </label>
        </div>

        <div className={styles.actionsRow}>
          <button type="button" onClick={handleCreateVisit} className={styles.saveBtn} disabled={saving}>
            {saving ? "Guardando..." : "Agregar Visita"}
          </button>
          {message && <span className={styles.message}>{message}</span>}
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Programa</th>
              <th>Fecha inicio</th>
              <th>Fecha final</th>
              <th>Asunto</th>
              <th>Modalidad</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={styles.programCell}>{row.program}</td>
                <td>{formatDate(row.startDate)}</td>
                <td>{formatDate(row.endDate)}</td>
                <td>{row.subject}</td>
                <td>{row.modality}</td>
                <td>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    disabled={deletingId === row.id}
                    onClick={() => handleDeleteVisit(row)}
                  >
                    {deletingId === row.id ? "Eliminando..." : "Eliminar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && rows.length === 0 && <p className={styles.empty}>No hay visitas de pares registradas.</p>}
      {loading && <p className={styles.empty}>Cargando visitas de pares...</p>}
    </div>
  );
}
