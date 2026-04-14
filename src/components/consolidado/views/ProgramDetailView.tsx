import type { ProgramRecord } from "../types";
import { formatDate } from "../utils";
import styles from "./styles/ProgramDetailView.module.css";

type Props = {
  program: ProgramRecord | null;
};

function chip(label: string, tone: "ok" | "warn" | "neutral") {
  const toneClass = {
    ok: styles.chipOk,
    warn: styles.chipWarn,
    neutral: styles.chipNeutral,
  }[tone];

  return <span className={`${styles.chip} ${toneClass}`}>{label}</span>;
}

export function ProgramDetailView({ program }: Props) {
  if (!program) {
    return <p className={styles.empty}>Selecciona un programa desde la matriz.</p>;
  }

  return (
    <article className={styles.panel}>
      <h3 className={styles.title}>{program.program}</h3>
      <p className={styles.subtitle}>
        {program.faculty} · {program.degree || "Sin titulo"}
      </p>

      <div className={styles.chips}>
        {chip(program.hasCurrentRc ? "RC vigente" : "RC vencido", program.hasCurrentRc ? "ok" : "warn")}
        {chip(program.acreditable ? "Acreditable" : "No acreditable", "neutral")}
        {chip(program.accredited ? "Acreditado" : "No acreditado", program.accredited ? "ok" : "warn")}
      </div>

      <dl className={styles.grid}>
        <div><dt>Codigo proceso</dt><dd>{program.processCode || "Sin dato"}</dd></div>
        <div><dt>SNIES</dt><dd>{program.snies || "Sin dato"}</dd></div>
        <div><dt>Inicio RC</dt><dd>{formatDate(program.rcStart)}</dd></div>
        <div><dt>Vencimiento RC</dt><dd>{formatDate(program.rcEnd)}</dd></div>
        <div><dt>Entrega CGCAI</dt><dd>{formatDate(program.rcSiga)}</dd></div>
        <div><dt>Plazo MinEducacion</dt><dd>{formatDate(program.rcMineducacion)}</dd></div>
        <div><dt>Inicio AAC</dt><dd>{formatDate(program.aacStart)}</dd></div>
        <div><dt>Vencimiento AAC</dt><dd>{formatDate(program.aacEnd)}</dd></div>
        <div><dt>Mitad vigencia AAC</dt><dd>{formatDate(program.aacImprovementHalfway)}</dd></div>
        <div><dt>Lugar</dt><dd>{program.location || "Sin dato"}</dd></div>
        <div><dt>Nivel</dt><dd>{program.level || "Sin dato"}</dd></div>
        <div><dt>Modalidad</dt><dd>{program.modality || "Sin dato"}</dd></div>
      </dl>
    </article>
  );
}
