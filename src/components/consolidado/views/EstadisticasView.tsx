"use client";

import { useState } from "react";

import type { ProgramRecord } from "../types";
import type { EstadisticasSubTab } from "../types";
import { EstadisticasGenerales } from "./estadisticas/EstadisticasGenerales";
import { EstadisticasRegistroCalificado } from "./estadisticas/EstadisticasRegistroCalificado";
import { EstadisticasAcreditacionProgramas } from "./estadisticas/EstadisticasAcreditacionProgramas";
import styles from "./styles/EstadisticasView.module.css";

type Props = {
  programs: ProgramRecord[];
  subTab: EstadisticasSubTab;
  onSubTabChange: (subTab: EstadisticasSubTab) => void;
};

const SUB_TABS = [
  { id: "generales" as const, label: "Generales" },
  { id: "registro-calificado" as const, label: "Registro Calificado" },
  { id: "acreditacion-programas" as const, label: "Acreditación de Programas" },
];

export function EstadisticasView({ programs, subTab, onSubTabChange }: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tab} ${subTab === tab.id ? styles.tabActive : ""}`}
              onClick={() => onSubTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.content}>
        {subTab === "generales" && <EstadisticasGenerales programs={programs} />}
        {subTab === "registro-calificado" && <EstadisticasRegistroCalificado programs={programs} />}
        {subTab === "acreditacion-programas" && <EstadisticasAcreditacionProgramas programs={programs} />}
      </div>
    </div>
  );
}
