"use client";

import { useMemo, useState } from "react";

import type { ProgramRecord } from "../types";
import { formatDate } from "../utils";
import styles from "./styles/ExpirationAlertsView.module.css";

type Props = {
  rows: ProgramRecord[];
};

type AlertMode = "rrc" | "acreditados";

type AlertLevel = "vencido" | "proximo" | "aldia" | "sin-fecha";

type AlertResult = {
  level: AlertLevel;
  label: string;
  days: number | null;
};

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

export function ExpirationAlertsView({ rows }: Props) {
  const [mode, setMode] = useState<AlertMode>("rrc");

  const rrcRows = useMemo(() => {
    return [...rows]
      .map((program) => {
        const rcAlert = evaluateAlert(program.rcEnd);
        const siacAlert = evaluateAlert(program.rcMineducacion);
        return {
          id: program.id,
          program: program.program,
          rcEnd: program.rcEnd,
          rcAlert,
          siacEnd: program.rcMineducacion,
          siacAlert,
          observations: program.generalObservations,
        };
      })
      .sort((a, b) => sortByClosestExpiration(a.rcEnd, b.rcEnd));
  }, [rows]);

  const accreditedRows = useMemo(() => {
    return [...rows]
      .filter((program) => program.accredited)
      .map((program) => {
        const aacAlert = evaluateAlert(program.aacEnd);
        const siacAlert = evaluateAlert(program.aacImprovementHalfway);
        return {
          id: program.id,
          program: program.program,
          aacEnd: program.aacEnd,
          aacAlert,
          siacEnd: program.aacImprovementHalfway,
          siacAlert,
          observations: program.generalObservations,
        };
      })
      .sort((a, b) => sortByClosestExpiration(a.aacEnd, b.aacEnd));
  }, [rows]);

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
                <th>Observaciones</th>
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
                  <td className={styles.observations}>{row.observations || "-"}</td>
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
                <th>Vencimiento SIAC AAC</th>
                <th>Alerta SIAC AAC</th>
                <th>Dias SIAC AAC</th>
                <th>Observaciones</th>
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
                  <td className={styles.observations}>{row.observations || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
