"use client";

import { useMemo } from "react";
import { useRef } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import html2canvas from "html2canvas";

import type { ProgramRecord } from "../../types";
import styles from "../styles/EstadisticasView.module.css";

type Props = {
  programs: ProgramRecord[];
};

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

export function EstadisticasAcreditacionProgramas({ programs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    const accreditedPrograms = programs.filter((program) => program.accredited);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let activeAac = 0;
    let expiredAac = 0;
    let noDateAac = 0;

    const byFaculty: Record<string, number> = {};
    const horizonBuckets = {
      vencida: 0,
      vence6m: 0,
      vence12m: 0,
      mas12m: 0,
      sinFecha: 0,
    };

    for (const program of accreditedPrograms) {
      byFaculty[program.faculty] = (byFaculty[program.faculty] ?? 0) + 1;

      const endDate = parseDate(program.aacEnd);
      if (!endDate) {
        noDateAac += 1;
        horizonBuckets.sinFecha += 1;
        continue;
      }

      const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        expiredAac += 1;
        horizonBuckets.vencida += 1;
      } else {
        activeAac += 1;
        if (diffDays <= 180) horizonBuckets.vence6m += 1;
        else if (diffDays <= 365) horizonBuckets.vence12m += 1;
        else horizonBuckets.mas12m += 1;
      }
    }

    const vigencyData = [
      { name: "AAC Vigente", y: activeAac, color: "#22c55e" },
      { name: "AAC Extendida", y: expiredAac, color: "#ef4444" },
      { name: "Sin Fecha AAC", y: noDateAac, color: "#94a3b8" },
    ].filter((item) => item.y > 0);

    const facultyData = Object.entries(byFaculty)
      .map(([name, value]) => ({ name, y: value }))
      .sort((a, b) => b.y - a.y)
      .slice(0, 12);

    const horizonData = [
      { name: "Extendida", y: horizonBuckets.vencida, color: "#ef4444" },
      { name: "Vence <= 6 meses", y: horizonBuckets.vence6m, color: "#f59e0b" },
      { name: "Vence 6-12 meses", y: horizonBuckets.vence12m, color: "#facc15" },
      { name: "Vigente > 12 meses", y: horizonBuckets.mas12m, color: "#22c55e" },
      { name: "Sin fecha AAC", y: horizonBuckets.sinFecha, color: "#94a3b8" },
    ];

    return {
      totalAccredited: accreditedPrograms.length,
      faculties: Object.keys(byFaculty).length,
      activeAac,
      expiredAac,
      noDateAac,
      vigencyData,
      facultyData,
      horizonData,
    };
  }, [programs]);

  async function handleDownloadPNG() {
    if (!containerRef.current) return;

    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `acreditacion-programas-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
    } catch (error) {
      console.error("Error downloading PNG:", error);
    }
  }

  async function handleDownloadChartPNG(elementId: string, chartName: string) {
    const element = containerRef.current?.querySelector(`#${elementId}`);
    if (!element) return;

    try {
      const canvas = await html2canvas(element as HTMLElement, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `acreditacion-${chartName}-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
    } catch (error) {
      console.error("Error downloading PNG:", error);
    }
  }

  const vigencyChartOptions = {
    credits: { enabled: false },
    chart: { type: "pie", style: { fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" } },
    title: { text: "Vigencia de la Acreditación (AAC)", style: { fontSize: "16px", fontWeight: "bold" } },
    tooltip: { pointFormat: "<b>{point.name}</b>: {point.y} ({point.percentage:.1f}%)" },
    plotOptions: { pie: { allowPointSelect: true, cursor: "pointer", dataLabels: { enabled: true, format: "{point.name}: {point.y}" } } },
    series: [{ name: "Programas", colorByPoint: true, data: stats.vigencyData }],
  } as Highcharts.Options;

  const facultyChartOptions = {
    credits: { enabled: false },
    chart: { type: "column", style: { fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" } },
    title: { text: "Top Facultades por Programas Acreditados", style: { fontSize: "16px", fontWeight: "bold" } },
    xAxis: { categories: stats.facultyData.map((item) => item.name), title: { text: "Facultad" } },
    yAxis: { title: { text: "Cantidad de Programas" } },
    tooltip: { shared: false },
    plotOptions: { column: { dataLabels: { enabled: true } } },
    series: [{ name: "Acreditados", type: "column", data: stats.facultyData.map((item) => item.y), color: "#3b82f6" }],
  } as Highcharts.Options;

  const horizonChartOptions = {
    credits: { enabled: false },
    chart: { type: "column", style: { fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" } },
    title: { text: "Semáforo de Vencimiento AAC", style: { fontSize: "16px", fontWeight: "bold" } },
    xAxis: { categories: stats.horizonData.map((item) => item.name), title: { text: "Horizonte de vigencia" } },
    yAxis: { title: { text: "Cantidad de Programas" } },
    tooltip: {
      useHTML: true,
      formatter: function (this: any) {
        const total = stats.horizonData.reduce((sum, item) => sum + item.y, 0);
        const value = this.y ?? 0;
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
        return `<b>${this.x}</b><br/>Programas: ${value}<br/>Porcentaje: ${percentage}%`;
      },
    },
    plotOptions: {
      column: {
        colorByPoint: true,
        dataLabels: {
          enabled: true,
          formatter: function (this: any) {
            return `${this.y ?? 0}`;
          },
        },
      },
    },
    series: [{ name: "Programas", type: "column", data: stats.horizonData }],
  } as Highcharts.Options;

  return (
    <div className={styles.estadisticasContainer}>
      <div className={styles.downloadButton}>
        <button type="button" onClick={handleDownloadPNG} className={styles.downloadBtn}>
          ⬇ Descargar Todo
        </button>
      </div>

      <div ref={containerRef} className={styles.estadisticasContent}>
        <h2 className={styles.sectionTitle}>Acreditación de Programas - Análisis</h2>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Programas Acreditados</span>
            <strong className={styles.statValue}>{stats.totalAccredited}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Facultades con Acreditados</span>
            <strong className={styles.statValue}>{stats.faculties}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>AAC Vigente</span>
            <strong className={styles.statValue}>{stats.activeAac}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>AAC Extendida</span>
            <strong className={styles.statValue}>{stats.expiredAac}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Sin Fecha AAC</span>
            <strong className={styles.statValue}>{stats.noDateAac}</strong>
          </div>
        </div>

        <div className={styles.chartsRow}>
          <div className={styles.chartCard} id="chart-aac-vigency">
            <HighchartsReact highcharts={Highcharts} options={vigencyChartOptions} />
            <button
              type="button"
              onClick={() => handleDownloadChartPNG("chart-aac-vigency", "vigencia")}
              className={styles.chartDownloadBtn}
            >
              Descargar
            </button>
          </div>

          <div className={styles.chartCard} id="chart-aac-faculty">
            <HighchartsReact highcharts={Highcharts} options={facultyChartOptions} />
            <button
              type="button"
              onClick={() => handleDownloadChartPNG("chart-aac-faculty", "facultades")}
              className={styles.chartDownloadBtn}
            >
              Descargar
            </button>
          </div>
        </div>

        <div className={styles.chartCard} style={{ marginTop: "2rem" }} id="chart-aac-horizon">
          <HighchartsReact highcharts={Highcharts} options={horizonChartOptions} />
          <button
            type="button"
            onClick={() => handleDownloadChartPNG("chart-aac-horizon", "semaforo")}
            className={styles.chartDownloadBtn}
          >
            Descargar
          </button>
        </div>
      </div>
    </div>
  );
}
