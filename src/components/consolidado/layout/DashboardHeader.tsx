"use client";

import Image from "next/image";

import { formatDate } from "../utils";
import styles from "./styles/DashboardHeader.module.css";
import type { UserRole } from "../types";

type Props = {
  source: string;
  generatedAt: string;
  currentUser: string;
  currentRole: UserRole;
  variant?: "public";
};

const ROLE_LABELS: Record<UserRole, string> = {
  administrador: "Administrador",
  usuario: "Usuario",
  visualizador: "Visualizador",
};

export function DashboardHeader({ source, generatedAt, currentUser, currentRole, variant }: Props) {
  const headerClassName = variant === "public" ? `${styles.header} ${styles.headerPublic}` : styles.header;

  return (
    <section className={headerClassName}>
      <div className={styles.brandRow}>
        <div className={styles.brandText}>
          <p className={styles.kicker}>Universidad del Cauca</p>
          <h1 className={styles.title}>Consolidado de Registro Calificado y Acreditación</h1>
        </div>
        <div className={styles.logoPair}>
          <Image src="/LogoPagina.png" alt="Logo pagina" width={128} height={128} className={styles.logo} priority />
          <Image src="/unicauca.png" alt="Logo Universidad del Cauca" width={128} height={128} className={`${styles.logo} ${styles.logoUnicauca}`} priority />
        </div>
      </div>
      <p className={styles.meta}>
        Fuente activa: <strong>{source.toUpperCase()}</strong> · Actualizado {formatDate(generatedAt)}
      </p>
    </section>
  );
}
