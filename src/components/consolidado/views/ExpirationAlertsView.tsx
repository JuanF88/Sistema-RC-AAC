"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState, useRef } from "react";
import { showToast } from "nextjs-toast-notify";

import type { ProgramRecord } from "../types";
import { formatDate } from "../utils";
import { exportToExcel, type ExportColumn } from "@/lib/export";
import styles from "./styles/ExpirationAlertsView.module.css";
import modalStyles from "./styles/ProgramEditModal.module.css";

type Props = {
  rows: ProgramRecord[];
  onExportReady?: (action: (() => Promise<void>) | null) => void;
  onProgramUpdate?: (program: ProgramRecord) => void;
};

type AlertMode = "rrc" | "acreditados";

type AlertType = "rrc" | "aac";

type AlertKind = "inicio" | "recordatorio" | "entrega";

type AlertLevel = "vencido" | "proximo" | "aldia" | "sin-fecha";

type AlertResult = {
  level: AlertLevel;
  label: string;
  days: number | null;
};

type AlertHistoryRecord = {
  id: string;
  program_id: string;
  alert_type: AlertType;
  alert_kind: AlertKind;
  sent_at: string;
  actor_username: string | null;
  recipients: string[];
};

const ALERT_KIND_LABELS: Record<AlertKind, string> = {
  inicio: "Inicio de renovacion",
  recordatorio: "Recordatorio semestral",
  entrega: "Recordatorio de entrega",
};

const START_MONTHS = 18;
const REMINDER_MONTHS = 6;
const DELIVERY_REMINDER_MONTHS = 2;

function parseIsoDate(value: string | null): Date | null {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysUntil(value: string | null): number | null {
  const target = parseIsoDate(value);
  if (!target) return null;

  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function evaluateAlert(value: string | null): AlertResult {
  const days = daysUntil(value);
  if (days === null) return { level: "sin-fecha", label: "Sin fecha", days: null };
  if (days < 0) return { level: "vencido", label: "Vencido", days };
  if (days <= 120) return { level: "proximo", label: "Proximo", days };
  return { level: "aldia", label: "Al dia", days };
}

function addMonths(value: string | null, months: number): string | null {
  if (!value) return null;
  const date = parseIsoDate(value);
  if (!date) return null;
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function isOnOrAfter(value: string | null): boolean {
  const date = parseIsoDate(value);
  if (!date) return false;
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return date.getTime() <= now.getTime();
}

function isFutureDate(value: string | null): boolean {
  const date = parseIsoDate(value);
  if (!date) return false;
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return date.getTime() > now.getTime();
}

function formatRelativeDays(value: string | null): string {
  const date = parseIsoDate(value);
  if (!date) return "-";
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "hoy";
  if (diff < 0) return `en ${Math.abs(diff)} dias`;
  if (diff < 30) return `hace ${diff} dias`;
  const months = Math.round(diff / 30);
  return `hace ${months} meses`;
}

function buildMomentStatus(dueDate: string | null, sentAt: string | null) {
  if (sentAt) {
    return { label: `Enviado ${formatDate(sentAt)}`, tone: "ok" as const, canSend: false };
  }
  if (!dueDate) {
    return { label: "Sin fecha", tone: "neutral" as const, canSend: false };
  }
  if (isOnOrAfter(dueDate)) {
    return { label: "Pendiente", tone: "warn" as const, canSend: true };
  }
  return { label: `Programado ${formatDate(dueDate)}`, tone: "neutral" as const, canSend: false };
}

function sortByClosestExpiration(left: string | null, right: string | null): number {
  const leftDays = daysUntil(left);
  const rightDays = daysUntil(right);

  if (leftDays === null && rightDays === null) return 0;
  if (leftDays === null) return 1;
  if (rightDays === null) return -1;
  return leftDays - rightDays;
}

function alertClass(level: AlertLevel): string {
  if (level === "vencido") return styles.badgeDanger;
  if (level === "proximo") return styles.badgeWarning;
  if (level === "aldia") return styles.badgeOk;
  return styles.badgeNeutral;
}

export function ExpirationAlertsView({ rows, onExportReady, onProgramUpdate }: Props) {
  const [mode, setMode] = useState<AlertMode>("rrc");
  const [programs, setPrograms] = useState(rows);
  const [savingObservationId, setSavingObservationId] = useState<string | null>(null);
  const [alertHistory, setAlertHistory] = useState<AlertHistoryRecord[]>([]);
  const [loadingAlertHistory, setLoadingAlertHistory] = useState(false);
  const [sendingAlertId, setSendingAlertId] = useState<string | null>(null);
  const [alertModal, setAlertModal] = useState<null | {
    id: string;
    program: string;
    type: AlertType;
    expiration: string | null;
    delivery: string | null;
    coordinatorEmail: string;
    coordinatorName: string | null;
  }>(null);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const rafIds = useRef<Record<string, number>>({});

  useEffect(() => {
    setPrograms(rows);
  }, [rows]);

  const loadAlertHistory = useCallback(async () => {
    setLoadingAlertHistory(true);
    try {
      const response = await fetch("/api/notifications/alertas", { cache: "no-store" });
      const body = (await response.json()) as { data?: AlertHistoryRecord[]; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "No se pudo cargar el historial de alertas.");
      }
      setAlertHistory(body.data ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cargar el historial de alertas.";
      showToast.error(message, {
        position: "top-right",
        duration: 2800,
      });
    } finally {
      setLoadingAlertHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadAlertHistory();
  }, [loadAlertHistory]);

  const programsRef = useRef(rows);
  useEffect(() => {
    programsRef.current = programs;
  }, [programs]);

  const historyMap = useMemo(() => {
    const map = new Map<string, AlertHistoryRecord>();
    for (const record of alertHistory) {
      const key = `${record.program_id}:${record.alert_type}:${record.alert_kind}`;
      if (!map.has(key)) {
        map.set(key, record);
      }
    }
    return map;
  }, [alertHistory]);

  const getHistoryRecord = useCallback(
    (programId: string, type: AlertType, kind: AlertKind): AlertHistoryRecord | null => {
      const key = `${programId}:${type}:${kind}`;
      return historyMap.get(key) ?? null;
    },
    [historyMap],
  );

  const buildAlertTimeline = useCallback(
    (programId: string, type: AlertType, expiration: string | null, delivery: string | null) => {
      const inicioRecord = getHistoryRecord(programId, type, "inicio");
      const reminderRecord = getHistoryRecord(programId, type, "recordatorio");
      const entregaRecord = getHistoryRecord(programId, type, "entrega");

      const startDate = addMonths(expiration, -START_MONTHS);
      const deliveryDue = addMonths(delivery, -DELIVERY_REMINDER_MONTHS);

      const reminderAnchor = reminderRecord?.sent_at ?? inicioRecord?.sent_at ?? startDate;
      const nextReminder = reminderAnchor ? addMonths(reminderAnchor, REMINDER_MONTHS) : null;

      return {
        inicioRecord,
        reminderRecord,
        entregaRecord,
        startDate,
        deliveryDue,
        nextReminder,
      };
    },
    [getHistoryRecord],
  );

  const rrcRows = useMemo(() => {
    return [...programs]
      .map((program) => {
        const rcAlert = evaluateAlert(program.rcEnd);
        const siacAlert = evaluateAlert(program.rcMineducacion);
        const timeline = buildAlertTimeline(program.id, "rrc", program.rcEnd, program.rcSiga);
        const inicioStatus = buildMomentStatus(timeline.startDate, timeline.inicioRecord?.sent_at ?? null);
        const reminderStatus = buildMomentStatus(timeline.nextReminder, timeline.reminderRecord?.sent_at ?? null);
        const entregaStatus = buildMomentStatus(timeline.deliveryDue, timeline.entregaRecord?.sent_at ?? null);
        const allSent = Boolean(
          timeline.inicioRecord?.sent_at &&
          timeline.reminderRecord?.sent_at &&
          timeline.entregaRecord?.sent_at,
        );
        return {
          id: program.id,
          program: program.program,
          rcEnd: program.rcEnd,
          rcAlert,
          coordinatorEmail: program.programCoordinatorEmail ?? "",
          coordinatorName: program.programCoordinator ?? null,
          siacEnd: program.rcMineducacion,
          siacAlert,
          expiration: program.rcEnd,
          delivery: program.rcSiga,
          observations: program.observacionesAlertaRrc ?? "",
          hasPendingAlert: inicioStatus.canSend || reminderStatus.canSend || entregaStatus.canSend,
          hasAllAlertsSent: allSent,
        };
      })
      .sort((a, b) => sortByClosestExpiration(a.rcEnd, b.rcEnd));
  }, [programs, buildAlertTimeline]);

  const accreditedRows = useMemo(() => {
    return [...programs]
      .filter((program) => program.accredited)
      .map((program) => {
        const aacAlert = evaluateAlert(program.aacEnd);
        const siacAlert = evaluateAlert(program.aacCgcaiDelivery);
        const timeline = buildAlertTimeline(program.id, "aac", program.aacEnd, program.aacCgcaiDelivery);
        const inicioStatus = buildMomentStatus(timeline.startDate, timeline.inicioRecord?.sent_at ?? null);
        const reminderStatus = buildMomentStatus(timeline.nextReminder, timeline.reminderRecord?.sent_at ?? null);
        const entregaStatus = buildMomentStatus(timeline.deliveryDue, timeline.entregaRecord?.sent_at ?? null);
        const allSent = Boolean(
          timeline.inicioRecord?.sent_at &&
          timeline.reminderRecord?.sent_at &&
          timeline.entregaRecord?.sent_at,
        );
        return {
          id: program.id,
          program: program.program,
          aacEnd: program.aacEnd,
          aacAlert,
          coordinatorEmail: program.programCoordinatorEmail ?? "",
          coordinatorName: program.programCoordinator ?? null,
          siacEnd: program.aacCgcaiDelivery,
          siacAlert,
          expiration: program.aacEnd,
          delivery: program.aacCgcaiDelivery,
          observations: program.observacionesAlertaAcreditados ?? "",
          hasPendingAlert: inicioStatus.canSend || reminderStatus.canSend || entregaStatus.canSend,
          hasAllAlertsSent: allSent,
        };
      })
      .sort((a, b) => sortByClosestExpiration(a.aacEnd, b.aacEnd));
  }, [programs, buildAlertTimeline]);

  const observationField = mode === "rrc" ? "observacionesAlertaRrc" : "observacionesAlertaAcreditados";
  const observationHeader = mode === "rrc" ? "Observaciones alerta RRC" : "Observaciones  acreditados";


  const adjustTextareaHeight = useCallback((element: HTMLTextAreaElement | null) => {
    if (!element) return;
    const programId = Object.keys(textareaRefs.current).find(
      (key) => textareaRefs.current[key] === element,
    );
    if (!programId) return;

    // Cancel previous RAF if pending
    if (rafIds.current[programId]) {
      cancelAnimationFrame(rafIds.current[programId]);
    }

    // Schedule measurement and adjustment with RAF
    rafIds.current[programId] = requestAnimationFrame(() => {
      element.style.height = "auto";
      element.style.height = `${Math.max(element.scrollHeight, 52)}px`;
      delete rafIds.current[programId];
    });
  }, []);

  useLayoutEffect(() => {
    const visibleRows = mode === "rrc" ? rrcRows : accreditedRows;
    for (const row of visibleRows) {
      adjustTextareaHeight(textareaRefs.current[row.id]);
    }
  }, [adjustTextareaHeight, accreditedRows, mode, rrcRows]);

  const setTextareaRef = useCallback(
    (programId: string) => (element: HTMLTextAreaElement | null) => {
      textareaRefs.current[programId] = element;
      if (element) {
        // Schedule initial height adjustment
        if (rafIds.current[programId]) {
          cancelAnimationFrame(rafIds.current[programId]);
        }
        rafIds.current[programId] = requestAnimationFrame(() => {
          element.style.height = "auto";
          element.style.height = `${Math.max(element.scrollHeight, 52)}px`;
          delete rafIds.current[programId];
        });
      }
    },
    [],
  );

  const handleObservationChange = useCallback((programId: string, value: string) => {
    setPrograms((current) =>
      current.map((program) =>
        program.id === programId
          ? ({ ...program, [observationField]: value } as ProgramRecord)
          : program,
      ),
    );
    
    // Schedule height adjustment after state update
    const textarea = textareaRefs.current[programId];
    if (textarea && rafIds.current[programId]) {
      cancelAnimationFrame(rafIds.current[programId]);
    }
    if (textarea) {
      rafIds.current[programId] = requestAnimationFrame(() => {
        textarea.style.height = "auto";
        textarea.style.height = `${Math.max(textarea.scrollHeight, 52)}px`;
        delete rafIds.current[programId];
      });
    }
  }, [observationField]);

  const handleObservationSave = useCallback(async (programId: string, nextValue: string) => {
    const program = programsRef.current.find((item) => item.id === programId);
    if (!program) return;

    const payload = {
      ...program,
      [observationField]: nextValue,
    } as ProgramRecord;

    setSavingObservationId(programId);
    try {
      const response = await fetch(`/api/consolidado-programas/${programId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "No se pudo guardar la observacion.");
      }

      setPrograms((current) => current.map((item) => (item.id === programId ? payload : item)));
      onProgramUpdate?.(payload);

      showToast.success("Observacion guardada.", {
        position: "top-right",
        transition: "bounceIn",
        duration: 1800,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar la observacion.";
      showToast.error(message, {
        position: "top-right",
        transition: "slideInUp",
        duration: 2800,
      });
    } finally {
      setSavingObservationId(null);
    }
  }, [observationField]);

  const handleSendAlert = useCallback(
    async (programId: string, alertType: AlertType, alertKind: AlertKind) => {
      setSendingAlertId(programId);
      try {
        const response = await fetch("/api/notifications/alertas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ programId, alertType, alertKind }),
        });
        const body = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(body.error ?? "No se pudo enviar la alerta.");
        }

        await loadAlertHistory();
        showToast.success("Alerta enviada.", {
          position: "top-right",
          duration: 2000,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo enviar la alerta.";
        showToast.error(message, {
          position: "top-right",
          duration: 2800,
        });
      } finally {
        setSendingAlertId(null);
      }
    },
    [loadAlertHistory],
  );

  // Keep reference to current data for export
  const dataRef = useRef({ rrcRows, accreditedRows, mode });
  useEffect(() => {
    dataRef.current = { rrcRows, accreditedRows, mode };
  }, [rrcRows, accreditedRows, mode]);

  const handleExport = useCallback(async () => {
    const timestamp = new Date().toLocaleDateString("es-CO");
    const data = dataRef.current;
    const modeLabel = data.mode === "rrc" ? "RRC" : "Acreditados";
    const filename = `Alertas-Vencimientos-${modeLabel}-${timestamp}`;

    const columns: ExportColumn[] =
      data.mode === "rrc"
        ? [
            { key: "program", header: "Programa", width: 38 },
            { key: "rcEnd", header: "Vencimiento R.C.", width: 18, formatter: (v) => formatDate(v as string | null | undefined) || "-" },
            { key: "rcAlert", header: "Alerta R.C.", width: 16 },
            { key: "rcDays", header: "Dias R.C.", width: 12 },
            { key: "siacEnd", header: "Vencimiento SIAC RRC", width: 22, formatter: (v) => formatDate(v as string | null | undefined) || "-" },
            { key: "siacAlert", header: "Alerta SIAC RRC", width: 18 },
            { key: "siacDays", header: "Dias SIAC RRC", width: 15 },
            { key: "observations", header: "Observaciones", width: 44 },
          ]
        : [
            { key: "program", header: "Programa", width: 38 },
            { key: "aacEnd", header: "Vencimiento AAC", width: 18, formatter: (v) => formatDate(v as string | null | undefined) || "-" },
            { key: "aacAlert", header: "Alerta AAC", width: 16 },
            { key: "aacDays", header: "Dias AAC", width: 12 },
            { key: "siacEnd", header: "Entrega al CGCAI", width: 22, formatter: (v) => formatDate(v as string | null | undefined) || "-" },
            { key: "siacAlert", header: "Alerta CGCAI", width: 18 },
            { key: "siacDays", header: "Dias CGCAI", width: 15 },
            { key: "observations", header: "Observaciones", width: 44 },
          ];

    const exportData =
      data.mode === "rrc"
        ? data.rrcRows.map((row) => ({
            program: row.program,
            rcEnd: row.rcEnd,
            rcAlert: row.rcAlert.label,
            rcDays: row.rcAlert.days ?? "-",
            siacEnd: row.siacEnd,
            siacAlert: row.siacAlert.label,
            siacDays: row.siacAlert.days ?? "-",
            observations: row.observations ?? "-",
          }))
        : data.accreditedRows.map((row) => ({
            program: row.program,
            aacEnd: row.aacEnd,
            aacAlert: row.aacAlert.label,
            aacDays: row.aacAlert.days ?? "-",
            siacEnd: row.siacEnd,
            siacAlert: row.siacAlert.label,
            siacDays: row.siacAlert.days ?? "-",
            observations: row.observations ?? "-",
          }));

    await exportToExcel(filename, `Alertas ${modeLabel}`, columns, exportData);
  }, []);


  useEffect(() => {
    if (!onExportReady) return;
    onExportReady(handleExport);
    return () => onExportReady(null);
  }, [onExportReady]);

  const modalTimeline = alertModal
    ? buildAlertTimeline(alertModal.id, alertModal.type, alertModal.expiration, alertModal.delivery)
    : null;

  const modalTypeLabel = alertModal?.type === "rrc" ? "RRC" : "AAC";
  const modalCanSend = Boolean(alertModal?.coordinatorEmail);

  const inicioStatus = modalTimeline
    ? buildMomentStatus(modalTimeline.startDate, modalTimeline.inicioRecord?.sent_at ?? null)
    : null;
  const reminderStatus = modalTimeline
    ? buildMomentStatus(modalTimeline.nextReminder, modalTimeline.reminderRecord?.sent_at ?? null)
    : null;
  const entregaStatus = modalTimeline
    ? buildMomentStatus(modalTimeline.deliveryDue, modalTimeline.entregaRecord?.sent_at ?? null)
    : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.switcher}>
        <button
          type="button"
          onClick={() => setMode("rrc")}
          className={`${styles.switchButton} ${mode === "rrc" ? styles.switchButtonActive : ""}`}
        >
          Alerta de vencimiento RRC
        </button>
        <button
          type="button"
          onClick={() => setMode("acreditados")}
          className={`${styles.switchButton} ${mode === "acreditados" ? styles.switchButtonActive : ""}`}
        >
          Alerta de vencimiento acreditados
        </button>
      </div>

      {mode === "rrc" ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Programa</th>
                <th>Vencimiento R.C.</th>
                <th>Alerta R.C.</th>
                <th>Dias R.C.</th>
                <th>Vencimiento SIAC RRC</th>
                <th>Alerta SIAC RRC</th>
                <th>Dias SIAC RRC</th>
                <th>Accion</th>
                <th>{observationHeader}</th>
              </tr>
            </thead>
            <tbody>
              {rrcRows.map((row) => (
                <tr key={row.id}>
                  <td className={styles.programCell}>{row.program}</td>
                  <td>{formatDate(row.rcEnd)}</td>
                  <td>
                    <span className={`${styles.badge} ${alertClass(row.rcAlert.level)}`}>{row.rcAlert.label}</span>
                  </td>
                  <td>{row.rcAlert.days ?? "-"}</td>
                  <td>{formatDate(row.siacEnd)}</td>
                  <td>
                    <span className={`${styles.badge} ${alertClass(row.siacAlert.level)}`}>{row.siacAlert.label}</span>
                  </td>
                  <td>{row.siacAlert.days ?? "-"}</td>
                  <td className={styles.actionCell}>
                    <button
                      type="button"
                      className={`${styles.sendButton} ${
                        row.hasAllAlertsSent
                          ? styles.sendButtonSuccess
                          : row.hasPendingAlert
                            ? ""
                            : styles.sendButtonInactive
                      }`}
                      onClick={() =>
                        (row.hasPendingAlert || row.hasAllAlertsSent) &&
                        setAlertModal({
                          id: row.id,
                          program: row.program,
                          type: "rrc",
                          expiration: row.expiration ?? null,
                          delivery: row.delivery ?? null,
                          coordinatorEmail: row.coordinatorEmail,
                          coordinatorName: row.coordinatorName ?? null,
                        })
                      }
                      disabled={!row.hasPendingAlert && !row.hasAllAlertsSent}
                    >
                      {row.hasAllAlertsSent
                        ? "Alertas enviadas"
                        : row.hasPendingAlert
                          ? "Gestionar alertas"
                          : "Inactivo"}
                    </button>
                  </td>
                  <td className={styles.observationsCell}>
                    <textarea
                      ref={setTextareaRef(row.id)}
                      className={styles.observationInput}
                      value={row.observations}
                      onChange={(event) => handleObservationChange(row.id, event.target.value)}
                      onBlur={(event) => void handleObservationSave(row.id, event.currentTarget.value)}
                      placeholder={observationHeader}
                      disabled={savingObservationId === row.id}
                    />
                    {savingObservationId === row.id && <span className={styles.saveHint}>Guardando...</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Programa</th>
                <th>Vencimiento AAC</th>
                <th>Alerta AAC</th>
                <th>Dias AAC</th>
                <th>Entrega al CGCAI</th>
                <th>Alerta CGCAI</th>
                <th>Dias CGCAI</th>
                <th>Accion</th>
                <th>{observationHeader}</th>
              </tr>
            </thead>
            <tbody>
              {accreditedRows.map((row) => (
                <tr key={row.id}>
                  <td className={styles.programCell}>{row.program}</td>
                  <td>{formatDate(row.aacEnd)}</td>
                  <td>
                    <span className={`${styles.badge} ${alertClass(row.aacAlert.level)}`}>{row.aacAlert.label}</span>
                  </td>
                  <td>{row.aacAlert.days ?? "-"}</td>
                  <td>{formatDate(row.siacEnd)}</td>
                  <td>
                    <span className={`${styles.badge} ${alertClass(row.siacAlert.level)}`}>{row.siacAlert.label}</span>
                  </td>
                  <td>{row.siacAlert.days ?? "-"}</td>
                  <td className={styles.actionCell}>
                    <button
                      type="button"
                      className={`${styles.sendButton} ${
                        row.hasAllAlertsSent
                          ? styles.sendButtonSuccess
                          : row.hasPendingAlert
                            ? ""
                            : styles.sendButtonInactive
                      }`}
                      onClick={() =>
                        (row.hasPendingAlert || row.hasAllAlertsSent) &&
                        setAlertModal({
                          id: row.id,
                          program: row.program,
                          type: "aac",
                          expiration: row.expiration ?? null,
                          delivery: row.delivery ?? null,
                          coordinatorEmail: row.coordinatorEmail,
                          coordinatorName: row.coordinatorName ?? null,
                        })
                      }
                      disabled={!row.hasPendingAlert && !row.hasAllAlertsSent}
                    >
                      {row.hasAllAlertsSent
                        ? "Alertas enviadas"
                        : row.hasPendingAlert
                          ? "Gestionar alertas"
                          : "Inactivo"}
                    </button>
                  </td>
                  <td className={styles.observationsCell}>
                    <textarea
                      ref={setTextareaRef(row.id)}
                      className={styles.observationInput}
                      value={row.observations}
                      onChange={(event) => handleObservationChange(row.id, event.target.value)}
                      onBlur={(event) => void handleObservationSave(row.id, event.currentTarget.value)}
                      placeholder={observationHeader}
                      disabled={savingObservationId === row.id}
                    />
                    {savingObservationId === row.id && <span className={styles.saveHint}>Guardando...</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {alertModal && modalTimeline && (
        <div
          className={`${modalStyles.backdrop} ${styles.alertModalBackdrop}`}
          onClick={() => setAlertModal(null)}
        >
          <div
            className={`${modalStyles.modal} ${styles.alertModal}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={modalStyles.header}>
              <div>
                <div className={modalStyles.title}>Gestion de alertas</div>
                <div className={modalStyles.subtitle}>
                  {alertModal.program} · {modalTypeLabel}
                </div>
                <div className={styles.modalMuted}>
                  Coordinador: {alertModal.coordinatorName || "-"} · Email: {alertModal.coordinatorEmail || "-"}
                </div>
              </div>
              <button type="button" className={modalStyles.closeButton} onClick={() => setAlertModal(null)}>
                Cerrar
              </button>
            </div>

            <div className={modalStyles.form}>
              <section className={`${modalStyles.section} ${modalStyles.sectionAmber}`}>
                <h4>Inicio de renovacion (18 meses antes)</h4>
                <div className={modalStyles.grid}>
                  <div className={modalStyles.field}>
                    <span>Fecha objetivo</span>
                    <strong className={styles.modalValue}>{formatDate(modalTimeline.startDate)}</strong>
                  </div>
                  <div className={modalStyles.field}>
                    <span>Estado</span>
                    <span
                      className={`${styles.modalStatus} ${
                        inicioStatus?.tone === "warn"
                          ? styles.modalStatusWarn
                          : inicioStatus?.tone === "ok"
                            ? styles.modalStatusOk
                            : styles.modalStatusNeutral
                      }`}
                    >
                      {inicioStatus?.label ?? "-"}
                    </span>
                  </div>
                  <div className={modalStyles.field}>
                    <span>Ultimo envio</span>
                    <strong className={styles.modalValue}>
                      {modalTimeline.inicioRecord?.sent_at
                        ? `${formatDate(modalTimeline.inicioRecord.sent_at)} (${formatRelativeDays(
                            modalTimeline.inicioRecord.sent_at,
                          )})`
                        : "-"}
                    </strong>
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.sendButton}
                    onClick={() => handleSendAlert(alertModal.id, alertModal.type, "inicio")}
                    disabled={!modalCanSend || !inicioStatus?.canSend || sendingAlertId === alertModal.id}
                  >
                    {sendingAlertId === alertModal.id ? "Enviando..." : "Enviar ahora"}
                  </button>
                </div>
              </section>

              <section className={`${modalStyles.section} ${modalStyles.sectionSky}`}>
                <h4>Recordatorios semestrales</h4>
                <div className={modalStyles.grid}>
                  <div className={modalStyles.field}>
                    <span>Proximo recordatorio</span>
                    <strong className={styles.modalValue}>{formatDate(modalTimeline.nextReminder)}</strong>
                  </div>
                  <div className={modalStyles.field}>
                    <span>Estado</span>
                    <span
                      className={`${styles.modalStatus} ${
                        reminderStatus?.tone === "warn"
                          ? styles.modalStatusWarn
                          : reminderStatus?.tone === "ok"
                            ? styles.modalStatusOk
                            : styles.modalStatusNeutral
                      }`}
                    >
                      {reminderStatus?.label ?? "-"}
                    </span>
                  </div>
                  <div className={modalStyles.field}>
                    <span>Ultimo envio</span>
                    <strong className={styles.modalValue}>
                      {modalTimeline.reminderRecord?.sent_at
                        ? `${formatDate(modalTimeline.reminderRecord.sent_at)} (${formatRelativeDays(
                            modalTimeline.reminderRecord.sent_at,
                          )})`
                        : "-"}
                    </strong>
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.sendButton}
                    onClick={() => handleSendAlert(alertModal.id, alertModal.type, "recordatorio")}
                    disabled={!modalCanSend || !reminderStatus?.canSend || sendingAlertId === alertModal.id}
                  >
                    {sendingAlertId === alertModal.id ? "Enviando..." : "Enviar ahora"}
                  </button>
                  <span className={styles.modalMuted}>Frecuencia: cada {REMINDER_MONTHS} meses</span>
                </div>
              </section>

              <section className={`${modalStyles.section} ${modalStyles.sectionRose}`}>
                <h4>Recordatorio de entrega (2 meses antes)</h4>
                <div className={modalStyles.grid}>
                  <div className={modalStyles.field}>
                    <span>Fecha objetivo</span>
                    <strong className={styles.modalValue}>{formatDate(modalTimeline.deliveryDue)}</strong>
                  </div>
                  <div className={modalStyles.field}>
                    <span>Estado</span>
                    <span
                      className={`${styles.modalStatus} ${
                        entregaStatus?.tone === "warn"
                          ? styles.modalStatusWarn
                          : entregaStatus?.tone === "ok"
                            ? styles.modalStatusOk
                            : styles.modalStatusNeutral
                      }`}
                    >
                      {entregaStatus?.label ?? "-"}
                    </span>
                  </div>
                  <div className={modalStyles.field}>
                    <span>Ultimo envio</span>
                    <strong className={styles.modalValue}>
                      {modalTimeline.entregaRecord?.sent_at
                        ? `${formatDate(modalTimeline.entregaRecord.sent_at)} (${formatRelativeDays(
                            modalTimeline.entregaRecord.sent_at,
                          )})`
                        : "-"}
                    </strong>
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.sendButton}
                    onClick={() => handleSendAlert(alertModal.id, alertModal.type, "entrega")}
                    disabled={!modalCanSend || !entregaStatus?.canSend || sendingAlertId === alertModal.id}
                  >
                    {sendingAlertId === alertModal.id ? "Enviando..." : "Enviar ahora"}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
