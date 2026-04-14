import { formatDate } from "../utils";
import styles from "./styles/DashboardHeader.module.css";

type Props = {
  source: string;
  generatedAt: string;
};

export function DashboardHeader({ source, generatedAt }: Props) {
  return (
    <section className={styles.header}>
      <p className={styles.kicker}>Universidad del Cauca</p>
      <h1 className={styles.title}>Consolidado de Registro Calificado y Acreditacion</h1>
      <p className={styles.meta}>
        Fuente activa: <strong>{source.toUpperCase()}</strong> · Actualizado {formatDate(generatedAt)}
      </p>
    </section>
  );
}
