"use client";

import { useRef } from "react";
import { useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import html2canvas from "html2canvas";

import type { ProgramRecord } from "../../types";
import styles from "../styles/EstadisticasView.module.css";

type Props = {
  programs: ProgramRecord[];
};

const COLORS = ["#f69f3b", "#b9a010", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function EstadisticasGenerales({ programs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    const totalPrograms = programs.length;
    const accredited = programs.filter((p) => p.accredited).length;
    const acreditable = programs.filter((p) => p.acreditable && !p.accredited).length;
    const inProcess = programs.filter((p) => p.inAccreditationProcess).length;
    const activeRc = programs.filter((p) => p.hasCurrentRc === true).length;
    const expiredRc = programs.filter((p) => p.hasCurrentRc === false).length;
    const totalAccreditableAndAccredited = programs.filter((p) => p.acreditable || p.accredited).length;
    const accreditationPercentage = totalAccreditableAndAccredited > 0 
      ? Math.round((accredited / totalAccreditableAndAccredited) * 100)
      : 0;

    const byFaculty: Record<string, { total: number; accredited: number }> = {};

    for (const program of programs) {
      if (!byFaculty[program.faculty]) {
        byFaculty[program.faculty] = { total: 0, accredited: 0 };
      }
      byFaculty[program.faculty].total += 1;
      if (program.accredited) byFaculty[program.faculty].accredited += 1;
    }

    const facultyData = Object.entries(byFaculty)
      .map(([faculty, data]) => ({
        name: faculty,
        total: data.total,
        acreditados: data.accredited,
      }))
      .sort((a, b) => b.total - a.total);

    const accreditationData = [
      { name: "Acreditados", y: accredited },
      { name: "Acreditables", y: acreditable },
      { name: "En proceso", y: inProcess },
      { name: "Sin acreditación", y: totalPrograms - accredited - acreditable - inProcess },
    ].filter((d) => d.y > 0);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const rcBuckets = {
      vencido: 0,
      vence6m: 0,
      vence12m: 0,
      mas12m: 0,
      sinFecha: 0,
    };

    for (const program of programs) {
      const rcEnd = program.rcEnd ? new Date(program.rcEnd) : null;
      const hasValidDate = rcEnd && !Number.isNaN(rcEnd.getTime());

      if (!hasValidDate) {
        if (program.hasCurrentRc === false) {
          rcBuckets.vencido += 1;
        } else {
          rcBuckets.sinFecha += 1;
        }
        continue;
      }

      rcEnd.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((rcEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) rcBuckets.vencido += 1;
      else if (diffDays <= 180) rcBuckets.vence6m += 1;
      else if (diffDays <= 365) rcBuckets.vence12m += 1;
      else rcBuckets.mas12m += 1;
    }

    const rcHorizonData = [
      { name: "Vencido", y: rcBuckets.vencido, color: "#ef4444" },
      { name: "Vence <= 6 meses", y: rcBuckets.vence6m, color: "#f59e0b" },
      { name: "Vence 6-12 meses", y: rcBuckets.vence12m, color: "#facc15" },
      { name: "Vigente > 12 meses", y: rcBuckets.mas12m, color: "#22c55e" },
      { name: "Sin fecha RC", y: rcBuckets.sinFecha, color: "#94a3b8" },
    ];

    return {
      totalPrograms,
      accredited,
      acreditable,
      inProcess,
      activeRc,
      expiredRc,
      faculties: Object.keys(byFaculty).length,
      facultyData,
      accreditationData,
      rcHorizonData,
      accreditedTotal: totalAccreditableAndAccredited,
      accreditationPercentage,
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
      link.download = `estadisticas-generales-${new Date().toISOString().slice(0, 10)}.png`;
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
      link.download = `estadisticas-generales-${chartName}-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
    } catch (error) {
      console.error("Error downloading PNG:", error);
    }
  }

  const accreditationChartOptions = {
    credits: { enabled: false },
    chart: { type: "pie", style: { fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" } },
    colors: ["#fc6f5b", "#fe965e", "#feceae", "#f59e0b", "#c2410c", "#7c4a36"],
    title: { text: "Distribución por Estado de Acreditación", style: { fontSize: "16px", fontWeight: "bold" } },
    tooltip: { pointFormat: "<b>{point.name}</b>: {point.y} ({point.percentage:.1f}%)" },
    plotOptions: { pie: { allowPointSelect: true, cursor: "pointer", dataLabels: { enabled: true, format: "{point.name}: {point.y}" } } },
    series: [{ name: "Programas", colorByPoint: true, data: stats.accreditationData }],
  } as Highcharts.Options;

  const rcChartOptions = {
    credits: { enabled: false },
    chart: { type: "column", style: { fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" } },
    colors: ["#fc6f5b", "#fe965e", "#feceae", "#f59e0b", "#c2410c", "#7c4a36"],
    title: { text: "Semaforo de Vencimiento del RC", style: { fontSize: "16px", fontWeight: "bold" } },
    xAxis: {
      categories: stats.rcHorizonData.map((item) => item.name),
      title: { text: "Estado de vigencia" },
    },
    yAxis: { title: { text: "Cantidad de Programas" } },
    tooltip: {
      formatter: function (this: any) {
        const total = stats.rcHorizonData.reduce((sum, item) => sum + item.y, 0);
        const value = this.y ?? 0;
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
        return `<b>${this.x}</b><br/>Programas: ${value}<br/>Porcentaje: ${percentage}%`;
      },
      useHTML: true,
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
    series: [{ name: "Programas", type: "column", data: stats.rcHorizonData }],
  } as Highcharts.Options;

  const facultyChartOptions = {
    credits: { enabled: false },
    chart: { type: "column", style: { fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" } },
    colors: ["#fc6f5b", "#fe965e", "#feceae", "#f59e0b", "#c2410c", "#7c4a36"],
    title: { text: "Programas por Facultad", style: { fontSize: "16px", fontWeight: "bold" } },
    xAxis: { categories: stats.facultyData.map((f) => f.name), title: { text: "Facultad" } },
    yAxis: { title: { text: "Cantidad de Programas" } },
    tooltip: { shared: true },
    plotOptions: { column: { dataLabels: { enabled: true } } },
    series: [
      { name: "Total", data: stats.facultyData.map((f) => f.total) },
      { name: "Acreditados", data: stats.facultyData.map((f) => f.acreditados) },
    ],
  } as Highcharts.Options;

  return (
    <div className={styles.estadisticasContainer}>
      <div className={styles.downloadButton}>
        <button type="button" onClick={handleDownloadPNG} className={styles.downloadBtn}>
          ⬇ Descargar Todo
        </button>
      </div>

      <div ref={containerRef} className={styles.estadisticasContent}>
        <h2 className={styles.sectionTitle}>Estadísticas Generales</h2>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total de Programas</span>
            <strong className={styles.statValue}>{stats.totalPrograms}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Facultades</span>
            <strong className={styles.statValue}>{stats.faculties}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Acreditados</span>
            <strong className={styles.statValue}>{stats.accredited}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Acreditables</span>
            <strong className={styles.statValue}>{stats.acreditable}</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>% Acreditados/Acreditables</span>
            <strong className={styles.statValue}>{stats.accreditationPercentage}%</strong>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>En Proceso AAC</span>
            <strong className={styles.statValue}>{stats.inProcess}</strong>
          </div>
        </div>

        <div className={styles.chartsRow}>
          <div className={styles.chartCard} id="chart-accreditation">
            <HighchartsReact highcharts={Highcharts} options={accreditationChartOptions} />
            <button
              type="button"
              onClick={() => handleDownloadChartPNG("chart-accreditation", "acreditacion")}
              className={styles.chartDownloadBtn}
            >
              Descargar
            </button>
          </div>

          <div className={styles.chartCard} id="chart-rc">
            <HighchartsReact highcharts={Highcharts} options={rcChartOptions} />
            <button
              type="button"
              onClick={() => handleDownloadChartPNG("chart-rc", "rc")}
              className={styles.chartDownloadBtn}
            >
              Descargar
            </button>
          </div>
        </div>

        <div className={styles.chartCard} style={{ marginTop: "2rem" }} id="chart-faculties">
          <HighchartsReact highcharts={Highcharts} options={facultyChartOptions} />
          <button
            type="button"
            onClick={() => handleDownloadChartPNG("chart-faculties", "facultades")}
            className={styles.chartDownloadBtn}
          >
            Descargar
          </button>
        </div>
      </div>
    </div>
  );
}
