import styles from "./styles/KpiGrid.module.css";

type Props = {
  summary: {
    totalPrograms: number;
    faculties: number;
    accreditable: number;
    accredited: number;
    accreditedOverAccreditablePct: number;
  };
};

export function KpiGrid({ summary }: Props) {
  const items: Array<[string, string | number]> = [
    ["Programas", summary.totalPrograms],
    ["Facultades", summary.faculties],
    ["Acreditables", summary.accreditable],
    ["Acreditados", summary.accredited],
    ["% acreditados sobre acreditables", `${summary.accreditedOverAccreditablePct}%`],
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
