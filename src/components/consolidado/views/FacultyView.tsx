import type { ConsolidadoDashboard } from "@/lib/consolidado";
import styles from "./styles/FacultyView.module.css";

type Props = {
  rows: ConsolidadoDashboard["byFaculty"];
};

export function FacultyView({ rows }: Props) {
  return (
    <div className={styles.grid}>
      {rows.map((row) => (
        <article key={row.faculty} className={styles.card}>
          <h3 className={styles.title}>{row.faculty}</h3>
          <p className={styles.text}>Programas: {row.programs}</p>
          <p className={styles.text}>RC vigentes: {row.activeRc}</p>
          <p className={styles.text}>Acreditados: {row.accredited}</p>
        </article>
      ))}
    </div>
  );
}
