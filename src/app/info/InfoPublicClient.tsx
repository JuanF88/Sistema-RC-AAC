"use client";

import { useState } from "react";

import type { EstadisticasSubTab, ProgramRecord } from "@/components/consolidado/types";
import { EstadisticasView } from "@/components/consolidado/views/EstadisticasView";
import { DashboardHeader } from "@/components/consolidado/layout/DashboardHeader";
import { LoginModelBackground } from "../login/LoginModelBackground";
import loginStyles from "../login/login.module.css";
import styles from "./info.module.css";

type Props = {
  programs: ProgramRecord[];
  source: string;
  generatedAt: string;
};

export function InfoPublicClient({ programs, source, generatedAt }: Props) {
  const [subTab, setSubTab] = useState<EstadisticasSubTab>("generales");

  return (
    <main className={styles.page}>
      <div className={`${loginStyles.modelLayer} ${styles.modelLayer}`} aria-hidden="true">
        <LoginModelBackground modelPosition={[-1.9, -0.8, -0.15]} modelScale={2.8} speed={0.2} />
      </div>
      <div className={loginStyles.gridOverlay} />
      <div className={styles.content}>
        <DashboardHeader
          source={source}
          generatedAt={generatedAt}
          currentUser="Publico"
          currentRole="visualizador"
          variant="public"
        />
        <div className={styles.panel}>
          <EstadisticasView programs={programs} subTab={subTab} onSubTabChange={setSubTab} />
        </div>
      </div>
    </main>
  );
}
