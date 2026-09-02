"use client";

import { useMemo, useState } from "react";

import type { ProgramRecord } from "../../types";
import { formatDate } from "../../utils";
import { ALERT_KIND_LABELS, ALERT_TYPE_LABELS, type AlertKind, type AlertType } from "./alertLabels";
import styles from "../styles/ExpirationAlertsView.module.css";

/**
 * Fila del historial de alertas, con lo unico que necesitan los conteos. Es un
 * subconjunto del registro que devuelve /api/notifications/alertas.
 */
export type AlertStatsRecord = {
  id: string;
  program_id: string;
  alert_type: AlertType;
  alert_kind: AlertKind;
  sent_at: string;
  actor_username: string | null;
  recipients: string[];
  email_sent: boolean | null;
};

/** Filtro de la tabla de detalle. */
type DetailFilter = "todas" | "enviadas" | "marcadas";

const DETAIL_FILTERS: { id: DetailFilter; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "enviadas", label: "Enviadas" },
  { id: "marcadas", label: "Marcadas sin enviar" },
];

type Props = {
  history: AlertStatsRecord[];
  programs: ProgramRecord[];
  loading: boolean;
};

type Counters = {
  total: number;
  /** El correo salio de verdad. */
  sent: number;
  /** Se uso "Marcar enviado": queda registrada pero no se envio nada. */
  marked: number;
  /** No se pudo consultar la auditoria de correos, asi que no hay como saberlo. */
  unknown: number;
};

function emptyCounters(): Counters {
  return { total: 0, sent: 0, marked: 0, unknown: 0 };
}

function countRecord(counters: Counters, emailSent: boolean | null): void {
  counters.total += 1;
  if (emailSent === true) counters.sent += 1;
  else if (emailSent === false) counters.marked += 1;
  else counters.unknown += 1;
}

/** "34%" — el porcentaje siempre se lee contra el total de alertas. */
function formatShare(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function statusLabel(emailSent: boolean | null): string {
  if (emailSent === true) return "Correo enviado";
  if (emailSent === false) return "Marcada sin enviar";
  return "Sin verificar";
}

function statusClass(emailSent: boolean | null): string {
  if (emailSent === true) return styles.badgeOk;
  if (emailSent === false) return styles.badgeWarning;
  return styles.badgeNeutral;
}

export function AlertasEstadisticas({ history, programs, loading }: Props) {
  const [detailFilter, setDetailFilter] = useState<DetailFilter>("todas");

  const programNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const program of programs) map.set(program.id, program.program);
    return map;
  }, [programs]);

  const stats = useMemo(() => {
    const totals = emptyCounters();
    const byType: Record<AlertType, Counters> = { rrc: emptyCounters(), aac: emptyCounters() };
    const byKind: Record<AlertKind, Counters> = {
      inicio: emptyCounters(),
      recordatorio: emptyCounters(),
      entrega: emptyCounters(),
    };
    // Programas distintos a los que si les llego el correo.
    const reachedPrograms = new Set<string>();

    for (const record of history) {
      countRecord(totals, record.email_sent);
      if (byType[record.alert_type]) countRecord(byType[record.alert_type], record.email_sent);
      if (byKind[record.alert_kind]) countRecord(byKind[record.alert_kind], record.email_sent);
      if (record.email_sent === true) reachedPrograms.add(record.program_id);
    }

    // Historial completo, de la alerta mas reciente a la mas antigua.
    const detail = [...history].sort((left, right) => right.sent_at.localeCompare(left.sent_at));

    return { totals, byType, byKind, detail, reachedPrograms: reachedPrograms.size };
  }, [history]);

  const filteredDetail = useMemo(() => {
    if (detailFilter === "enviadas") return stats.detail.filter((record) => record.email_sent === true);
    if (detailFilter === "marcadas") return stats.detail.filter((record) => record.email_sent === false);
    return stats.detail;
  }, [detailFilter, stats.detail]);

  if (loading && history.length === 0) {
    return <p className={styles.statsEmpty}>Cargando historial de alertas...</p>;
  }

  if (history.length === 0) {
    return <p className={styles.statsEmpty}>Todavia no se ha registrado ninguna alerta.</p>;
  }

  const { totals } = stats;

  return (
    <div className={styles.statsWrap}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Alertas registradas</span>
          <span className={styles.statValue}>{totals.total}</span>
          <span className={styles.statHint}>Enviadas y marcadas, en todo el historial</span>
        </div>

        <div className={`${styles.statCard} ${styles.statCardSent}`}>
          <span className={styles.statLabel}>Correos enviados</span>
          <span className={styles.statValue}>{totals.sent}</span>
          <span className={styles.statHint}>
            {formatShare(totals.sent, totals.total)} del total · {stats.reachedPrograms}{" "}
            {stats.reachedPrograms === 1 ? "programa notificado" : "programas notificados"}
          </span>
        </div>

        <div className={`${styles.statCard} ${styles.statCardMarked}`}>
          <span className={styles.statLabel}>Marcadas sin enviar</span>
          <span className={styles.statValue}>{totals.marked}</span>
          <span className={styles.statHint}>
            {formatShare(totals.marked, totals.total)} del total · quedaron registradas, pero no salio ningun correo
          </span>
        </div>

        {/* Solo aparece si la auditoria de correos no se pudo consultar: en ese
            caso no se puede afirmar ni que salio ni que no. */}
        {totals.unknown > 0 && (
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Sin verificar</span>
            <span className={styles.statValue}>{totals.unknown}</span>
            <span className={styles.statHint}>No se pudo consultar la auditoria de correos</span>
          </div>
        )}
      </div>

      <p className={styles.statsNote}>
        Una alerta cuenta como enviada cuando el sistema tiene registrado el correo que salio por ella. Las
        marcadas sin enviar son las que se registraron con el boton &quot;Marcar enviado&quot;, sin que el programa
        recibiera nada.
      </p>

      <section className={styles.statsSection}>
        <h4 className={styles.statsSectionTitle}>Por proceso</h4>
        <div className={styles.statsTableWrap}>
          <table className={`${styles.table} ${styles.statsTable}`}>
            <thead>
              <tr>
                <th>Proceso</th>
                <th>Registradas</th>
                <th>Enviadas</th>
                <th>Marcadas sin enviar</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(ALERT_TYPE_LABELS) as AlertType[]).map((type) => (
                <tr key={type}>
                  <td className={styles.programCell}>{ALERT_TYPE_LABELS[type]}</td>
                  <td>{stats.byType[type].total}</td>
                  <td>{stats.byType[type].sent}</td>
                  <td>{stats.byType[type].marked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.statsSection}>
        <h4 className={styles.statsSectionTitle}>Por etapa</h4>
        <div className={styles.statsTableWrap}>
          <table className={`${styles.table} ${styles.statsTable}`}>
            <thead>
              <tr>
                <th>Etapa</th>
                <th>Registradas</th>
                <th>Enviadas</th>
                <th>Marcadas sin enviar</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(ALERT_KIND_LABELS) as AlertKind[]).map((kind) => (
                <tr key={kind}>
                  <td className={styles.programCell}>{ALERT_KIND_LABELS[kind]}</td>
                  <td>{stats.byKind[kind].total}</td>
                  <td>{stats.byKind[kind].sent}</td>
                  <td>{stats.byKind[kind].marked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.statsSection}>
        <div className={styles.statsSectionHeader}>
          <h4 className={styles.statsSectionTitle}>Detalle de alertas</h4>
          <div className={styles.switcher}>
            {DETAIL_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setDetailFilter(filter.id)}
                className={`${styles.switchButton} ${detailFilter === filter.id ? styles.switchButtonActive : ""}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {filteredDetail.length === 0 ? (
          <p className={styles.statsEmpty}>Ninguna alerta en este filtro.</p>
        ) : (
          <div className={styles.statsTableWrap}>
            <table className={`${styles.table} ${styles.statsTable}`}>
              <thead>
                <tr>
                  <th>Programa</th>
                  <th>Proceso</th>
                  <th>Etapa</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Destinatarios</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {filteredDetail.map((record) => (
                  <tr key={record.id}>
                    <td className={styles.programCell}>
                      {programNames.get(record.program_id) ?? "Programa no disponible"}
                    </td>
                    <td>{ALERT_TYPE_LABELS[record.alert_type]}</td>
                    <td>{ALERT_KIND_LABELS[record.alert_kind]}</td>
                    <td>{formatDate(record.sent_at)}</td>
                    <td>
                      <span className={`${styles.badge} ${statusClass(record.email_sent)}`}>
                        {statusLabel(record.email_sent)}
                      </span>
                    </td>
                    <td>{record.recipients.join("; ") || "-"}</td>
                    <td>{record.actor_username ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
