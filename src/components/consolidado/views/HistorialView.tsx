"use client";

import { useCallback, useEffect, useState } from "react";
import { showToast } from "nextjs-toast-notify";
import type { ProgramRecord } from "../types";
import styles from "./styles/HistorialView.module.css";

type HistorialSnapshot = {
  filename: string;
  url: string;
  timestamp: string;
};

type Props = {
  programs: ProgramRecord[];
  generatedAt: string;
};

const SNAPSHOTS_STORAGE_KEY = "historial_snapshots";

export function HistorialView({ programs, generatedAt }: Props) {
  const [snapshots, setSnapshots] = useState<HistorialSnapshot[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadSnapshots = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/historial/export-snapshot", { method: "GET" });
      const body = (await response.json()) as {
        success?: boolean;
        data?: HistorialSnapshot[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error ?? "No se pudo cargar el historial de snapshots.");
      }

      const serverSnapshots = Array.isArray(body.data) ? body.data : [];
      setSnapshots(serverSnapshots);
      localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(serverSnapshots));
    } catch {
      const stored = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
      if (stored) {
        try {
          setSnapshots(JSON.parse(stored) as HistorialSnapshot[]);
        } catch {
          setSnapshots([]);
        }
      } else {
        setSnapshots([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSnapshots();
  }, [loadSnapshots]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadSnapshots();
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [loadSnapshots]);

  const handleExportSnapshot = useCallback(
    async () => {
      setIsExporting(true);
      try {
        const response = await fetch("/api/historial/export-snapshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ programs, generatedAt }),
        });

        const body = (await response.json()) as {
          success?: boolean;
          filename?: string;
          url?: string;
          timestamp?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(body.error ?? "No se pudo exportar el snapshot.");
        }

        await loadSnapshots();

        showToast.success("Snapshot guardado exitosamente.", {
          position: "top-right",
          duration: 2000,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error al guardar snapshot.";
        showToast.error(message, {
          position: "top-right",
          duration: 3000,
        });
      } finally {
        setIsExporting(false);
      }
    },
    [programs, generatedAt, loadSnapshots]
  );

  if (isLoading) {
    return <div className={styles.container}>Cargando historial...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h2 className={styles.title}>Historial de Base de Datos</h2>
          <p className={styles.subtitle}>Snapshots automáticos según la programación global + exportación manual bajo demanda</p>
        </div>
        <button
          type="button"
          className={styles.exportButton}
          onClick={() => handleExportSnapshot()}
          disabled={isExporting}
        >
          {isExporting ? "Guardando..." : "💾 Guardar Instantánea"}
        </button>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total de Snapshots</span>
          <strong className={styles.statValue}>{snapshots.length}</strong>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Programas Almacenados</span>
          <strong className={styles.statValue}>{programs.length}</strong>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Última Actualización</span>
          <strong className={styles.statValue}>{new Date(generatedAt).toLocaleDateString("es-CO")}</strong>
        </div>
      </div>

      <div className={styles.snapshotsSection}>
        <h3 className={styles.sectionTitle}>Snapshots Guardados</h3>
        {snapshots.length === 0 ? (
          <p className={styles.emptyState}>No hay snapshots guardados aún. Haz clic en "Guardar Instantánea" para crear uno.</p>
        ) : (
          <div className={styles.snapshotsList}>
            {snapshots.map((snapshot) => (
              <div key={snapshot.filename} className={styles.snapshotCard}>
                <div className={styles.snapshotInfo}>
                  <h4 className={styles.snapshotName}>{snapshot.filename}</h4>
                  <p className={styles.snapshotDate}>{new Date(snapshot.timestamp).toLocaleString("es-CO")}</p>
                </div>
                <a href={snapshot.url} download className={styles.downloadLink}>
                  ⬇ Descargar
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.infoBox}>
        <h4>ℹ️ Información</h4>
        <ul>
          <li>Los snapshots automáticos se programan desde Configuración - Correos.</li>
          <li>Puedes guardar snapshots adicionales en cualquier momento con el botón de arriba.</li>
          <li>Cada snapshot incluye BD Completa, Registro, Acreditación y RC Vigencia.</li>
          <li>Los archivos se guardan en el bucket "historicos-database" de Supabase.</li>
          <li>El historial se consulta directamente desde Supabase para evitar mostrar archivos borrados.</li>
        </ul>
      </div>
    </div>
  );
}
