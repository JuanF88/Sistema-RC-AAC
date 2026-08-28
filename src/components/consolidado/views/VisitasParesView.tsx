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

type SortField = "program" | "startDate" | "endDate" | "subject" | "modality";

type SortDirection = "asc" | "desc";

/** Columnas de fecha: al ordenarlas se empieza por las mas recientes. */
const DATE_SORT_FIELDS: SortField[] = ["startDate", "endDate"];

const MODALITY_OPTIONS = ["Presencial", "Virtual", "Hibrida"] as const;

const EMPTY_FORM: NewVisitaForm = {
  program: "",
  startDate: "",
  endDate: "",
  subject: "",
  modality: MODALITY_OPTIONS[0],
};

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

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "es", { sensitivity: "base" });
}

export function VisitasParesView({ programs, onExportReady }: Props) {
  const [rows, setRows] = useState<VisitaPar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // El formulario vive en un modal: se abre vacio para registrar una visita nueva
  // o cargado con los datos de una existente cuando se edita.
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<NewVisitaForm>(EMPTY_FORM);
  // La tabla arranca por la fecha de inicio mas reciente, que es como se
  // consultan las visitas en el dia a dia.
  const [sortField, setSortField] = useState<SortField>("startDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

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

  const sortedRows = useMemo(() => {
    const source = [...rows];

    source.sort((left, right) => {
      let result = 0;
      switch (sortField) {
        case "program":
          result = compareText(left.program, right.program);
          break;
        // Las fechas se guardan en ISO (YYYY-MM-DD): compararlas como texto ya
        // las deja en orden cronologico.
        case "startDate":
          result = compareText(left.startDate ?? "", right.startDate ?? "");
          break;
        case "endDate":
          result = compareText(left.endDate ?? "", right.endDate ?? "");
          break;
        case "subject":
          result = compareText(left.subject, right.subject);
          break;
        case "modality":
          result = compareText(left.modality, right.modality);
          break;
      }

      if (result === 0) {
        result = compareText(left.program, right.program);
      }

      return sortDirection === "asc" ? result : -result;
    });

    return source;
  }, [rows, sortField, sortDirection]);

  function handleSortChange(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    // Las fechas se muestran de la mas reciente a la mas antigua; el resto de
    // columnas se ordenan alfabeticamente.
    setSortDirection(DATE_SORT_FIELDS.includes(field) ? "desc" : "asc");
  }

  function getSortIndicator(field: SortField) {
    if (sortField !== field) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  }

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMessage("");
  }, []);

  function handleOpenCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMessage("");
    setModalOpen(true);
  }

  function handleStartEdit(row: VisitaPar) {
    setEditingId(row.id);
    setForm({
      program: row.program,
      startDate: row.startDate,
      endDate: row.endDate,
      subject: row.subject,
      modality: row.modality,
    });
    setMessage("");
    setModalOpen(true);
  }

  // Escape cierra el modal, como en el resto de ventanas del sistema.
  useEffect(() => {
    if (!modalOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleCloseModal();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, handleCloseModal]);

  async function handleSaveVisit() {
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

    const isEditing = Boolean(editingId);
    const errorFallback = isEditing
      ? "No se pudo actualizar la visita de pares."
      : "No se pudo registrar la visita de pares.";

    try {
      setSaving(true);
      const response = await fetch(isEditing ? `/api/visitas-pares/${editingId}` : "/api/visitas-pares", {
        method: isEditing ? "PATCH" : "POST",
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
        throw new Error(body.error ?? errorFallback);
      }

      if (body.data) {
        const saved: VisitaPar = {
          id: body.data.id,
          program: body.data.program,
          startDate: body.data.start_date,
          endDate: body.data.end_date,
          subject: body.data.subject,
          modality: body.data.modality,
        };

        setRows((current) =>
          isEditing ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current],
        );
      }

      handleCloseModal();
      showToast.success(isEditing ? "Visita de pares actualizada correctamente." : "Visita de pares registrada correctamente.", {
        position: "top-right",
        transition: "bounceIn",
        duration: 2800,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : errorFallback;
      setMessage(msg);
      showToast.error(msg, { position: "top-right", transition: "slideInUp", duration: 3000 });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteVisit(row: VisitaPar) {
    const confirmed = window.confirm(`Deseas eliminar la visita de pares del programa "${row.program}"?`);
    if (!confirmed) return;

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
      // Si la visita borrada era la que estaba abierta en el modal, este se cierra
      // para no guardar cambios sobre un registro que ya no existe.
      if (editingId === row.id) handleCloseModal();
      showToast.warning("Visita de pares eliminada correctamente.", {
        position: "top-right",
        transition: "slideInUp",
        duration: 2600,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo eliminar la visita de pares.";
      showToast.error(msg, { position: "top-right", transition: "slideInUp", duration: 3000 });
    } finally {
      setDeletingId(null);
    }
  }

  // Keep reference to current rows for export
  // Se exporta en el mismo orden que muestra la tabla.
  const rowsRef = useRef(sortedRows);
  useEffect(() => {
    rowsRef.current = sortedRows;
  }, [sortedRows]);

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
      <div className={styles.headerRow}>
        <div>
          <h3 className={styles.headerTitle}>Visitas de Pares</h3>
          <p className={styles.headerHint}>
            {loading ? "Cargando visitas de pares..." : `${rows.length} ${rows.length === 1 ? "visita registrada" : "visitas registradas"}`}
          </p>
        </div>
        <button type="button" className={styles.createBtn} onClick={handleOpenCreate} disabled={saving}>
          Nueva visita
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>
                <button type="button" className={styles.sortButton} onClick={() => handleSortChange("program")}>
                  <span>Programa</span>
                  <span className={styles.sortIndicator}>{getSortIndicator("program")}</span>
                </button>
              </th>
              <th>
                <button type="button" className={styles.sortButton} onClick={() => handleSortChange("startDate")}>
                  <span>Fecha inicio</span>
                  <span className={styles.sortIndicator}>{getSortIndicator("startDate")}</span>
                </button>
              </th>
              <th>
                <button type="button" className={styles.sortButton} onClick={() => handleSortChange("endDate")}>
                  <span>Fecha final</span>
                  <span className={styles.sortIndicator}>{getSortIndicator("endDate")}</span>
                </button>
              </th>
              <th>
                <button type="button" className={styles.sortButton} onClick={() => handleSortChange("subject")}>
                  <span>Asunto</span>
                  <span className={styles.sortIndicator}>{getSortIndicator("subject")}</span>
                </button>
              </th>
              <th>
                <button type="button" className={styles.sortButton} onClick={() => handleSortChange("modality")}>
                  <span>Modalidad</span>
                  <span className={styles.sortIndicator}>{getSortIndicator("modality")}</span>
                </button>
              </th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.id} className={editingId === row.id ? styles.editingRow : undefined}>
                <td className={styles.programCell}>{row.program}</td>
                <td>{formatDate(row.startDate)}</td>
                <td>{formatDate(row.endDate)}</td>
                <td>{row.subject}</td>
                <td>{row.modality}</td>
                <td>
                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={styles.editBtn}
                      disabled={saving || deletingId === row.id}
                      onClick={() => handleStartEdit(row)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      disabled={deletingId === row.id}
                      onClick={() => handleDeleteVisit(row)}
                    >
                      {deletingId === row.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && rows.length === 0 && <p className={styles.empty}>No hay visitas de pares registradas.</p>}
      {loading && <p className={styles.empty}>Cargando visitas de pares...</p>}

      {modalOpen && (
        <div className={styles.backdrop} onClick={handleCloseModal} role="presentation">
          {/* El clic dentro del modal no debe cerrarlo: solo cuenta el del fondo. */}
          <div className={styles.modal} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editingId ? "Editar visita de pares" : "Nueva visita de pares"}</h3>
              <button type="button" className={styles.closeBtn} onClick={handleCloseModal} disabled={saving}>
                Cerrar
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <label className={`${styles.field} ${styles.fieldFull}`}>
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

                <label className={`${styles.field} ${styles.fieldFull}`}>
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

              {message && <p className={styles.message}>{message}</p>}
            </div>

            <div className={styles.modalFooter}>
              <button type="button" onClick={handleCloseModal} className={styles.cancelBtn} disabled={saving}>
                Cancelar
              </button>
              <button type="button" onClick={handleSaveVisit} className={styles.saveBtn} disabled={saving}>
                {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Agregar visita"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
