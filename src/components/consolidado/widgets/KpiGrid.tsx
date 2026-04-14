import type { ConsolidadoDashboard } from "@/lib/consolidado";
import styles from "./styles/KpiGrid.module.css";

type Props = {
  summary: ConsolidadoDashboard["summary"];
};

export function KpiGrid({ summary }: Props) {
  const items: Array<[string, number]> = [
    ["Programas", summary.totalPrograms],
    ["Facultades", summary.faculties],
    ["RC vigente", summary.activeRc],
    ["RC vencido", summary.expiredRc],
    ["Acreditados", summary.accredited],
  ];

  return (
    <section className={styles.grid}>
      {items.map(([label, value], idx) => (
        <article key={label} className={styles.card} style={{ animationDelay: `${idx * 60}ms` }}>
          <p className={styles.label}>{label}</p>
          <p className={styles.value}>{value}</p>
        </article>
      ))}
    </section>
  );
}
