"use client";

import { useState } from "react";
import styles from "./styles/ExportButton.module.css";

interface ExportButtonProps {
  onExport: () => void | Promise<void>;
  isDisabled?: boolean;
  label?: string;
  floating?: boolean;
}

export function ExportButton({ onExport, isDisabled = false, label = "Descargar Excel", floating = false }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isDisabled || isExporting) return;
    try {
      setIsExporting(true);
      await onExport();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`${styles.exportContainer} ${floating ? styles.floating : ""}`}>
      <button
        type="button"
        className={`${styles.exportButton} ${isDisabled || isExporting ? styles.disabled : ""}`}
        onClick={handleExport}
        disabled={isDisabled || isExporting}
        title="Descargar en formato Excel (.xlsx)"
      >
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 2v12m0 0l-4-4m4 4l4-4M4 14h16a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{isExporting ? "Generando..." : label}</span>
      </button>
    </div>
  );
}
