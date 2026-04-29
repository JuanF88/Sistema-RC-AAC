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

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function EstadisticasRegistroCalificado({ programs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => {
    // Normalize levels
    const levelBuckets = {
      tecnologia: 0,
      profesional: 0,
      especializacion: 0,
      especializacionMedQuir: 0,
      maestria: 0,
      doctorado: 0,
    };

    const facultyCounts: Record<string, { pregrado: number; posgrado: number }> = {};
    let totalPregrado = 0;
    let totalPosgrado = 0;

    for (const program of programs) {
      if (!program.level) continue;

      const levelLower = program.level.toLowerCase().trim();

      // Categorize into level buckets
      if (levelLower.includes("tecnol")) {
        levelBuckets.tecnologia += 1;
        totalPregrado += 1;
      } else if (levelLower.includes("profesional")) {
        levelBuckets.profesional += 1;
        totalPregrado += 1;
      } else if (levelLower.includes("especialización médico") || levelLower.includes("medico")) {
        levelBuckets.especializacionMedQuir += 1;
        totalPosgrado += 1;
      } else if (levelLower.includes("especializ")) {
        levelBuckets.especializacion += 1;
        totalPosgrado += 1;
      } else if (levelLower.includes("maestr")) {
        levelBuckets.maestria += 1;
        totalPosgrado += 1;
      } else if (levelLower.includes("doctorad")) {
        levelBuckets.doctorado += 1;
        totalPosgrado += 1;
      }

      // Faculty counts
      if (!facultyCounts[program.faculty]) {
        facultyCounts[program.faculty] = { pregrado: 0, posgrado: 0 };
      }

      const isPregrado =
        levelLower.includes("tecnol") || levelLower.includes("profesional");
      if (isPregrado) {
        facultyCounts[program.faculty].pregrado += 1;
      } else {
        facultyCounts[program.faculty].posgrado += 1;
      }
    }

    // Pie chart data
    const levelData = [
      { name: "Tecnología", y: levelBuckets.tecnologia },
      { name: "Profesional", y: levelBuckets.profesional },
      { name: "Especialización", y: levelBuckets.especializacion },
      { name: "Esp. Médico-Quirúrgica", y: levelBuckets.especializacionMedQuir },
      { name: "Maestría", y: levelBuckets.maestria },
      { name: "Doctorado", y: levelBuckets.doctorado },
    ].filter((d) => d.y > 0);

    // Pregrado vs Posgrado
    const totalNiveles = totalPregrado + totalPosgrado;
    const pregradoPosgradoData = [
      { name: "Pregrado", y: totalPregrado, percentage: totalNiveles > 0 ? ((totalPregrado / totalNiveles) * 100).toFixed(1) : "0.0" },
      { name: "Posgrado", y: totalPosgrado, percentage: totalNiveles > 0 ? ((totalPosgrado / totalNiveles) * 100).toFixed(1) : "0.0" },
    ];

    // Faculty breakdown
    const facultyData = Object.entries(facultyCounts)
      .map(([faculty, { pregrado, posgrado }]) => ({
        name: faculty,
        Pregrado: pregrado,
        Posgrado: posgrado,
      }))
      .sort((a, b) => (b.Pregrado + b.Posgrado) - (a.Pregrado + a.Posgrado));

    return {
      levelData,
      pregradoPosgradoData,
      facultyData,
      levelBuckets,
    };
  }, [programs]);

  async function handleDownloadPNG(elementId: string, chartName: string) {
    const element = containerRef.current?.querySelector(`#${elementId}`);
    if (!element) return;

    try {
      const canvas = await html2canvas(element as HTMLElement, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `registro-calificado-${chartName}-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
    } catch (error) {
      console.error("Error downloading PNG:", error);
    }
  }

  async function handleDownloadAllPNG() {
    if (!containerRef.current) return;

    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `registro-calificado-completo-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
    } catch (error) {
      console.error("Error downloading PNG:", error);
    }
  }

  // Highcharts options
  const levelDistributionOptions = {
    credits: { enabled: false },
    chart: { type: "pie", style: { fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" } },
    colors: ["#fc6f5b", "#fe965e", "#feceae", "#f59e0b", "#c2410c", "#7c4a36"],
    title: { text: "Distribución por Tipo de Nivel", style: { fontSize: "16px", fontWeight: "bold" } },
    tooltip: { pointFormat: "<b>{point.name}</b>: {point.y} ({point.percentage:.1f}%)" },
    plotOptions: { pie: { allowPointSelect: true, cursor: "pointer", dataLabels: { enabled: true, format: "{point.name}: {point.y}" } } },
    series: [{ name: "Programas", colorByPoint: true, data: stats.levelData }],
  } as Highcharts.Options;

  const pregradoPosgradoOptions = {
    credits: { enabled: false },
    chart: { type: "column", style: { fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" } },
    colors: ["#fc6f5b", "#fe965e"],
    title: { text: "Pregrado vs Posgrado", style: { fontSize: "16px", fontWeight: "bold" } },
    xAxis: { categories: stats.pregradoPosgradoData.map((d) => d.name), title: { text: "" } },
    yAxis: { title: { text: "Cantidad de Programas" } },
    tooltip: {
      shared: false,
      useHTML: true,
      formatter: function (this: any) {
        const point = this.point as Highcharts.Point & { options?: { percentage?: string } };
        const percentage = point.options?.percentage ?? "0.0";
        return `<b>${point.name ?? this.x}</b><br/>Porcentaje: ${percentage}%`;
      },
    },
    plotOptions: {
      column: {
        dataLabels: {
          enabled: true,
          formatter: function (this: any) {
            const pointOptions = this.point.options as { percentage?: string } | undefined;
            return `${pointOptions?.percentage ?? "0.0"}%`;
          },
        },
      },
    },
    series: [{ name: "Programas", data: stats.pregradoPosgradoData }],
  } as Highcharts.Options;

  const facultyDistributionOptions = {
    credits: { enabled: false },
    chart: { type: "column", style: { fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" } },
    colors: ["#fc6f5b", "#fe965e"],
    title: { text: "Distribución por Facultad", style: { fontSize: "16px", fontWeight: "bold" } },
    xAxis: { categories: stats.facultyData.map((f) => f.name), title: { text: "Facultad" } },
    yAxis: { title: { text: "Cantidad de Programas" } },
    tooltip: { shared: true },
    plotOptions: { column: { dataLabels: { enabled: true } } },
    series: [
      { name: "Pregrado", data: stats.facultyData.map((f) => f.Pregrado) },
      { name: "Posgrado", data: stats.facultyData.map((f) => f.Posgrado) },
    ],
  } as Highcharts.Options;

  return (
    <div className={styles.estadisticasContainer}>
      <div className={styles.downloadButton}>
        <button type="button" onClick={handleDownloadAllPNG} className={styles.downloadBtn}>
          ⬇ Descargar Todo
        </button>
      </div>

      <div ref={containerRef} className={styles.estadisticasContent}>
        <h2 className={styles.sectionTitle}>Registro Calificado - Análisis</h2>

        <div className={styles.chartsRow}>
          <div className={styles.chartCard} id="chart-level-distribution">
            <HighchartsReact highcharts={Highcharts} options={levelDistributionOptions} />
            <button
              type="button"
              onClick={() => handleDownloadPNG("chart-level-distribution", "tipos")}
              className={styles.chartDownloadBtn}
            >
              Descargar
            </button>
          </div>

          <div className={styles.chartCard} id="chart-pregrado-posgrado">
            <HighchartsReact highcharts={Highcharts} options={pregradoPosgradoOptions} />
            <button
              type="button"
              onClick={() => handleDownloadPNG("chart-pregrado-posgrado", "pregrado-posgrado")}
              className={styles.chartDownloadBtn}
            >
              Descargar
            </button>
          </div>
        </div>

        <div className={styles.chartCard} style={{ marginTop: "2rem" }} id="chart-faculty">
          <HighchartsReact highcharts={Highcharts} options={facultyDistributionOptions} />
          <button
            type="button"
            onClick={() => handleDownloadPNG("chart-faculty", "facultades")}
            className={styles.chartDownloadBtn}
          >
            Descargar
          </button>
        </div>
      </div>
    </div>
  );
}
