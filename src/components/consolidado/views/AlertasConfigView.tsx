"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { showToast } from "nextjs-toast-notify";

import styles from "./styles/AlertasConfigView.module.css";

type NotificationRecipient = {
  id: string;
  email: string;
  full_name?: string | null;
  is_active: boolean;
};

type SnapshotFrequency = "daily" | "weekly" | "biweekly" | "monthly";

type SnapshotSchedule = {
  enabled: boolean;
  frequency: SnapshotFrequency;
  hour: number;
  minute: number;
  last_run_at: string | null;
  next_run_at: string | null;
};

const FREQUENCY_LABELS: Record<SnapshotFrequency, string> = {
  daily: "Diario",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
};

const BOGOTA_TIME_ZONE = "America/Bogota";

function toTimeInput(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseTimeInput(value: string): { hour: number; minute: number } {
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  return {
    hour: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 8,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0,
  };
}

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: BOGOTA_TIME_ZONE,
  }).format(date);
}

export function AlertasConfigView() {
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [savingRecipients, setSavingRecipients] = useState(false);
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [newRecipientName, setNewRecipientName] = useState("");
  const [schedule, setSchedule] = useState<SnapshotSchedule | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const activeCount = useMemo(() => recipients.filter((recipient) => recipient.is_active).length, [recipients]);

  const loadRecipients = useCallback(async () => {
    setLoadingRecipients(true);
    try {
      const response = await fetch("/api/notifications/recipients");
      const body = (await response.json()) as { data?: NotificationRecipient[]; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "No se pudieron cargar los destinatarios.");
      }
      setRecipients(body.data ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar los destinatarios.";
      showToast.error(message, {
        position: "top-right",
        duration: 2800,
      });
    } finally {
      setLoadingRecipients(false);
    }
  }, []);

  useEffect(() => {
    void loadRecipients();
  }, [loadRecipients]);

  const loadSchedule = useCallback(async () => {
    setLoadingSchedule(true);
    try {
      const response = await fetch("/api/notifications/snapshot-settings", { cache: "no-store" });
      const body = (await response.json()) as { data?: SnapshotSchedule; error?: string };
      if (!response.ok || !body.data) {
        throw new Error(body.error ?? "No se pudo cargar la programacion de snapshots.");
      }
      setSchedule(body.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cargar la programacion de snapshots.";
      showToast.error(message, {
        position: "top-right",
        duration: 2800,
      });
    } finally {
      setLoadingSchedule(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const handleSaveSchedule = useCallback(async () => {
    if (!schedule) return;

    setSavingSchedule(true);
    try {
      const response = await fetch("/api/notifications/snapshot-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: schedule.enabled,
          frequency: schedule.frequency,
          hour: schedule.hour,
          minute: schedule.minute,
        }),
      });
      const body = (await response.json()) as { data?: SnapshotSchedule; error?: string };

      if (!response.ok || !body.data) {
        throw new Error(body.error ?? "No se pudo guardar la programacion.");
      }

      setSchedule(body.data);
      showToast.success("Programacion de snapshots actualizada.", {
        position: "top-right",
        duration: 2200,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar la programacion.";
      showToast.error(message, {
        position: "top-right",
        duration: 2800,
      });
    } finally {
      setSavingSchedule(false);
    }
  }, [schedule]);

  const handleAddRecipient = useCallback(async () => {
    const email = newRecipientEmail.trim().toLowerCase();
    if (!email) {
      showToast.warning("Ingresa un correo para agregar.", {
        position: "top-right",
        duration: 2200,
      });
      return;
    }

    setSavingRecipients(true);
    try {
      const response = await fetch("/api/notifications/recipients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName: newRecipientName.trim(), isActive: true }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "No se pudo agregar el destinatario.");
      }

      setNewRecipientEmail("");
      setNewRecipientName("");
      await loadRecipients();

      showToast.success("Destinatario guardado.", {
        position: "top-right",
        duration: 2200,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo agregar el destinatario.";
      showToast.error(message, {
        position: "top-right",
        duration: 2800,
      });
    } finally {
      setSavingRecipients(false);
    }
  }, [loadRecipients, newRecipientEmail, newRecipientName]);

  const handleToggleRecipient = useCallback(
    async (recipient: NotificationRecipient) => {
      setSavingRecipients(true);
      try {
        const response = await fetch(`/api/notifications/recipients/${encodeURIComponent(recipient.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !recipient.is_active }),
        });
        const body = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(body.error ?? "No se pudo actualizar el destinatario.");
        }

        await loadRecipients();
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo actualizar el destinatario.";
        showToast.error(message, {
          position: "top-right",
          duration: 2800,
        });
      } finally {
        setSavingRecipients(false);
      }
    },
    [loadRecipients],
  );

  const handleDeleteRecipient = useCallback(
    async (recipient: NotificationRecipient) => {
      const confirmed = window.confirm(`¿Eliminar destinatario ${recipient.email}?`);
      if (!confirmed) return;

      setSavingRecipients(true);
      try {
        const response = await fetch(`/api/notifications/recipients/${encodeURIComponent(recipient.id)}`, {
          method: "DELETE",
        });
        const body = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(body.error ?? "No se pudo eliminar el destinatario.");
        }

        await loadRecipients();
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo eliminar el destinatario.";
        showToast.error(message, {
          position: "top-right",
          duration: 2800,
        });
      } finally {
        setSavingRecipients(false);
      }
    },
    [loadRecipients],
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.headerCard}>
        <h2 className={styles.title}>Configuracion Global de Alertas</h2>
        <p className={styles.description}>
          Define aqui los destinatarios globales y la programacion de snapshots para enviar automaticamente la copia de la BD.
        </p>
        <div className={styles.statsRow}>
          <span className={styles.statPill}>Destinatarios activos: {activeCount}</span>
        </div>
      </div>

      <div className={styles.formCard}>
        <h3 className={styles.cardTitle}>Programacion automatica de snapshots</h3>
        {loadingSchedule || !schedule ? (
          <p className={styles.empty}>Cargando configuracion de programacion...</p>
        ) : (
          <>
            <div className={styles.scheduleGrid}>
              <label className={styles.fieldLabel}>
                <span>Estado</span>
                <select
                  className={styles.input}
                  value={schedule.enabled ? "enabled" : "disabled"}
                  onChange={(event) =>
                    setSchedule((current) =>
                      current
                        ? {
                            ...current,
                            enabled: event.target.value === "enabled",
                          }
                        : current,
                    )
                  }
                  disabled={savingSchedule}
                >
                  <option value="enabled">Activo</option>
                  <option value="disabled">Pausado</option>
                </select>
              </label>

              <label className={styles.fieldLabel}>
                <span>Frecuencia</span>
                <select
                  className={styles.input}
                  value={schedule.frequency}
                  onChange={(event) =>
                    setSchedule((current) =>
                      current
                        ? {
                            ...current,
                            frequency: event.target.value as SnapshotFrequency,
                          }
                        : current,
                    )
                  }
                  disabled={savingSchedule}
                >
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.fieldLabel}>
                <span>Hora de envio (America/Bogota)</span>
                <input
                  type="time"
                  className={styles.input}
                  value={toTimeInput(schedule.hour, schedule.minute)}
                  onChange={(event) => {
                    const parsed = parseTimeInput(event.target.value);
                    setSchedule((current) =>
                      current
                        ? {
                            ...current,
                            hour: parsed.hour,
                            minute: parsed.minute,
                          }
                        : current,
                    );
                  }}
                  disabled={savingSchedule}
                />
              </label>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void handleSaveSchedule()}
                disabled={savingSchedule}
              >
                {savingSchedule ? "Guardando..." : "Guardar programacion"}
              </button>
            </div>

            <div className={styles.scheduleMeta}>
              <span>Frecuencia: {FREQUENCY_LABELS[schedule.frequency]}</span>
              <span>Ultima ejecucion: {formatDateTime(schedule.last_run_at)}</span>
              <span>Proxima ejecucion (hora Colombia): {formatDateTime(schedule.next_run_at)}</span>
            </div>
          </>
        )}
      </div>

      <div className={styles.formCard}>
        <h3 className={styles.cardTitle}>Agregar destinatario</h3>
        <div className={styles.formRow}>
          <input
            type="email"
            value={newRecipientEmail}
            onChange={(event) => setNewRecipientEmail(event.target.value)}
            placeholder="Correo destinatario"
            className={styles.input}
            disabled={savingRecipients}
          />
          <input
            type="text"
            value={newRecipientName}
            onChange={(event) => setNewRecipientName(event.target.value)}
            placeholder="Nombre (opcional)"
            className={styles.input}
            disabled={savingRecipients}
          />
          <button type="button" className={styles.primaryButton} onClick={() => void handleAddRecipient()} disabled={savingRecipients}>
            {savingRecipients ? "Guardando..." : "Agregar"}
          </button>
        </div>
      </div>

      <div className={styles.listCard}>
        <h3 className={styles.cardTitle}>Destinatarios configurados</h3>
        {recipients.length === 0 ? (
          <p className={styles.empty}>No hay destinatarios configurados.</p>
        ) : (
          <div className={styles.list}>
            {recipients.map((recipient) => (
              <div key={recipient.id} className={styles.item}>
                <div className={styles.itemInfo}>
                  <strong>{recipient.full_name?.trim() || "Sin nombre"}</strong>
                  <span>{recipient.email}</span>
                </div>
                <div className={styles.itemActions}>
                  <button
                    type="button"
                    className={recipient.is_active ? styles.deactivateButton : styles.activateButton}
                    onClick={() => void handleToggleRecipient(recipient)}
                    disabled={savingRecipients}
                  >
                    {recipient.is_active ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => void handleDeleteRecipient(recipient)}
                    disabled={savingRecipients}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
