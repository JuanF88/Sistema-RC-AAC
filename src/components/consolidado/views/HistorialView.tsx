"use client";

import { useCallback, useEffect, useState } from "react";
import { showToast } from "nextjs-toast-notify";
import type { ProgramRecord } from "../types";
import styles from "./styles/HistorialView.module.css";

type HistorialSnapshot = {
  filename: string;
  url: string;
  timestamp: string;
};

type EmailAuditRecord = {
  id: string;
  created_at: string;
  sent_at: string | null;
  status: "sent" | "failed";
  source: string | null;
  actor_username: string | null;
  subject: string;
  recipients: string[];
  cc_recipients: string[] | null;
  bcc_recipients: string[] | null;
  has_attachments: boolean;
  attachment_names: string[] | null;
  error_message: string | null;
};

type SnapshotFrequency = "daily" | "weekly" | "biweekly" | "monthly";

type SnapshotSchedule = {
  enabled: boolean;
  frequency: SnapshotFrequency;
  hour: number;
  minute: number;
  next_run_at: string | null;
};

type Props = {
  programs: ProgramRecord[];
  generatedAt: string;
};

const SNAPSHOTS_STORAGE_KEY = "historial_snapshots";
const HISTORIAL_TAB_KEY = "historial_active_tab";
const BOGOTA_TIME_ZONE = "America/Bogota";

const FREQUENCY_LABELS: Record<SnapshotFrequency, string> = {
  daily: "Diario",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
};

function formatBogotaDateTime(value: string | null): string {
  if (!value) return "Sin programación";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin programación";

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: BOGOTA_TIME_ZONE,
  }).format(date);
}

export function HistorialView({ programs, generatedAt }: Props) {
  const [snapshots, setSnapshots] = useState<HistorialSnapshot[]>([]);
  const [emailHistory, setEmailHistory] = useState<EmailAuditRecord[]>([]);
  const [schedule, setSchedule] = useState<SnapshotSchedule | null>(null);
  const [activeTab, setActiveTab] = useState<"snapshots" | "emails">("snapshots");
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(true);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);

  const loadSnapshots = useCallback(async () => {
    setIsLoadingSnapshots(true);
    try {
      const response = await fetch("/api/historial/export-snapshot", { method: "GET" });
      const body = (await response.json()) as {
        success?: boolean;
        data?: HistorialSnapshot[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error ?? "No se pudo cargar el historial de snapshots.");
      }

      const serverSnapshots = Array.isArray(body.data) ? body.data : [];
      setSnapshots(serverSnapshots);
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(serverSnapshots));
    } catch {
      const stored = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
      if (stored) {
        try {
          setSnapshots(JSON.parse(stored) as HistorialSnapshot[]);
        } catch {
          setSnapshots([]);
        }
      } else {
        setSnapshots([]);
      }
    } finally {
      setIsLoadingSnapshots(false);
    }
  }, []);

  const loadSchedule = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/snapshot-settings", { cache: "no-store" });
      const body = (await response.json()) as { data?: SnapshotSchedule; error?: string };

      if (!response.ok || !body.data) {
        throw new Error(body.error ?? "No se pudo cargar la programacion de snapshots.");
      }

      setSchedule(body.data);
    } catch {
      setSchedule(null);
    }
  }, []);

  const loadEmailHistory = useCallback(async () => {
    setIsLoadingEmails(true);
    try {
      const response = await fetch("/api/notifications/email-history", { cache: "no-store" });
      const body = (await response.json()) as { data?: EmailAuditRecord[]; error?: string };

      if (!response.ok || !body.data) {
        throw new Error(body.error ?? "No se pudo cargar el historial de correos.");
      }

      setEmailHistory(body.data);
    } catch {
      setEmailHistory([]);
    } finally {
      setIsLoadingEmails(false);
    }
  }, []);

  useEffect(() => {
    void loadSnapshots();
    void loadSchedule();
    void loadEmailHistory();
  }, [loadSnapshots, loadSchedule, loadEmailHistory]);

  useEffect(() => {
    const stored = window.localStorage.getItem(HISTORIAL_TAB_KEY);
    if (stored === "snapshots" || stored === "emails") {
      setActiveTab(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(HISTORIAL_TAB_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadSnapshots();
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [loadSnapshots]);

  const handleExportSnapshot = useCallback(
    async () => {
      setIsExporting(true);
      try {
        const response = await fetch("/api/historial/export-snapshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ programs, generatedAt }),
        });

        const body = (await response.json()) as {
          success?: boolean;
          filename?: string;
          url?: string;
          timestamp?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(body.error ?? "No se pudo exportar el snapshot.");
        }

        await loadSnapshots();

        showToast.success("Snapshot guardado exitosamente.", {
          position: "top-right",
          duration: 2000,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al guardar snapshot.";
        showToast.error(message, {
          position: "top-right",
          duration: 3000,
        });
      } finally {
        setIsExporting(false);
      }
    },
    [programs, generatedAt, loadSnapshots]
  );

  if (isLoadingSnapshots) {
    return <div className={styles.container}>Cargando historial...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h2 className={styles.title}>Historial de Base de Datos</h2>
          <p className={styles.subtitle}>Snapshots automáticos según la programación global + exportación manual bajo demanda</p>
        </div>
        <button
          type="button"
          className={styles.exportButton}
          onClick={() => handleExportSnapshot()}
          disabled={isExporting}
        >
          {isExporting ? "Guardando..." : "💾 Guardar Instantánea"}
        </button>
      </div>

      <div className={styles.tabBar}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "snapshots" ? styles.tabButtonActive : ""}`}
          onClick={() => setActiveTab("snapshots")}
        >
          Historial snapshots
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "emails" ? styles.tabButtonActive : ""}`}
          onClick={() => setActiveTab("emails")}
        >
          Historial correos
        </button>
      </div>

      {activeTab === "snapshots" ? (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Total de Snapshots</span>
              <strong className={styles.statValue}>{snapshots.length}</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Programas Almacenados</span>
              <strong className={styles.statValue}>{programs.length}</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Última Actualización</span>
              <strong className={styles.statValue}>{new Date(generatedAt).toLocaleDateString("es-CO")}</strong>
            </div>
          </div>


          <div className={styles.snapshotsSection}>
            <h3 className={styles.sectionTitle}>Snapshots Guardados</h3>
            {snapshots.length === 0 ? (
              <p className={styles.emptyState}>No hay snapshots guardados aún. Haz clic en "Guardar Instantánea" para crear uno.</p>
            ) : (
              <div className={styles.snapshotsList}>
                {snapshots.map((snapshot) => (
                  <div key={snapshot.filename} className={styles.snapshotCard}>
                    <div className={styles.snapshotInfo}>
                      <h4 className={styles.snapshotName}>{snapshot.filename}</h4>
                      <p className={styles.snapshotDate}>{new Date(snapshot.timestamp).toLocaleString("es-CO")}</p>
                    </div>
                    <a href={snapshot.url} download className={styles.downloadLink}>
                      ⬇ Descargar
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className={styles.emailHistorySection}>
          <div className={styles.scheduleCard}>
            <div className={styles.scheduleCardHeader}>
              <h3 className={styles.sectionTitle}>Historial de correos enviados</h3>
              <span className={styles.emailCountBadge}>{emailHistory.length} registros</span>
            </div>

            {isLoadingEmails ? (
              <p className={styles.emptyState}>Cargando historial de correos...</p>
            ) : emailHistory.length === 0 ? (
              <p className={styles.emptyState}>No hay correos enviados registrados todavía.</p>
            ) : (
              <div className={styles.emailList}>
                {emailHistory.map((record) => (
                  <article key={record.id} className={styles.emailCard}>
                    <div className={styles.emailCardHeader}>
                      <div>
                        <h4 className={styles.emailSubject}>{record.subject}</h4>
                        <p className={styles.emailMeta}>
                          {formatBogotaDateTime(record.sent_at ?? record.created_at)} · {record.source ?? "sin origen"}
                        </p>
                      </div>
                      <span className={`${styles.scheduleBadge} ${record.status === "sent" ? styles.scheduleBadgeActive : styles.scheduleBadgeDisabled}`}>
                        {record.status === "sent" ? "Enviado" : "Fallido"}
                      </span>
                    </div>
                    <div className={styles.emailDetails}>
                      <div>
                        <span className={styles.scheduleLabel}>Destinatarios</span>
                        <strong className={styles.scheduleValue}>{record.recipients.join(", ")}</strong>
                      </div>
                      <div>
                        <span className={styles.scheduleLabel}>Adjuntos</span>
                        <strong className={styles.scheduleValue}>{record.has_attachments ? (record.attachment_names?.join(", ") || "Sí") : "No"}</strong>
                      </div>
                      <div>
                        <span className={styles.scheduleLabel}>Usuario</span>
                        <strong className={styles.scheduleValue}>{record.actor_username ?? "Sistema"}</strong>
                      </div>
                    </div>
                    {record.error_message ? <p className={styles.emailError}>Error: {record.error_message}</p> : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
