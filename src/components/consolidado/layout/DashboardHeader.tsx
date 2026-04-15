"use client";

import { formatDate } from "../utils";
import styles from "./styles/DashboardHeader.module.css";
import type { UserRole } from "../types";

type Props = {
  source: string;
  generatedAt: string;
  currentUser: string;
  currentRole: UserRole;
};

const ROLE_LABELS: Record<UserRole, string> = {
  administrador: "Administrador",
  usuario: "Usuario",
  visualizador: "Visualizador",
};

export function DashboardHeader({ source, generatedAt, currentUser, currentRole }: Props) {

  return (
    <section className={styles.header}>
      <div className={styles.topBar}>
        <p className={styles.kicker}>Universidad del Cauca</p>
      </div>
      <h1 className={styles.title}>Consolidado de Registro Calificado y Acreditacion</h1>
      <p className={styles.meta}>
        Fuente activa: <strong>{source.toUpperCase()}</strong> · Actualizado {formatDate(generatedAt)}
      </p>
    </section>
  );
}
